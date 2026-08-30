/**
 * @description Finds the git worktrees that exist ON DISK for a user's repositories, whether or not
 * OpenThrottle created them. Read-only with respect to git: it never creates, prunes or removes a
 * worktree.
 *
 * Two sources, unioned and deduped on the symlink-resolved real path:
 *   1. `git worktree list --porcelain` run LIVE in each registered primary checkout — authoritative
 *      for a repository, and it sees worktrees under any root. (The cached
 *      `inspection.git.linkedWorktrees` snapshot is deliberately NOT used: it is keyed on
 *      `scannedAt` and goes stale.)
 *   2. A depth-1 scan of the resolved worktree root, keeping children whose `.git` is a FILE — the
 *      same linked-worktree test RepositoryInspectionService applies. This is what catches a
 *      worktree whose base checkout is not registered, or whose primary lives outside the
 *      configured workspace roots.
 *
 * Bounded and non-fatal by construction: every git probe carries a timeout and maxBuffer, the scan
 * never recurses, the result is capped with the overflow COUNTED and warned about, and every fs or
 * git failure becomes a warning instead of an exception. Discovery must not be able to make
 * /settings/repositories hang or 500.
 *
 * Path containment: the only directory read is the root the shared ladder resolves. No
 * client-supplied path reaches this service.
 */

import { execFile } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { RepositoryCheckout } from '@openthrottle/nestjs-repositories';
import {
  RepositoryCheckoutsService,
  UserWorkspaceSettingsService,
} from '@openthrottle/nestjs-repositories';
import { parseLinkedWorktrees } from '../../graphql/repository-inspection/parse-linked-worktrees';
import type { WorktreeRootSource } from '../worktree-root/worktree-root.resolver';
import { realPath } from '../paths/real-path';
import { resolveWorktreeRoot } from '../worktree-root/worktree-root.resolver';
import type {
  DiscoveredWorktree,
  ScannedWorktreeRoot,
  WorktreeDiscoveryProblem,
  WorktreeDiscoveryProblemKind,
  WorktreeDiscoveryResult,
  WorktreeDiscoverySource,
} from './worktree-discovery.types';
import {
  WORKTREE_DISCOVERY_PROBLEM,
  WORKTREE_DISCOVERY_SOURCE,
} from './worktree-discovery.types';

const execFileAsync = promisify(execFile);

/** Per-git-probe timebox. Matches RepositoryInspectionService so the page's budgets agree. */
const GIT_COMMAND_TIMEOUT_MS = 2_000;

/** Cap on stdout per git probe; worktree/status listings stay well inside this. */
const GIT_MAX_BUFFER_BYTES = 1024 * 1024;

/** Hard cap on rows returned. Overflow is counted and warned about, never silently dropped. */
export const MAX_DISCOVERED_WORKTREES = 200;

/** Matches the ceiling `workspaceRepositories` already uses for a user's checkouts. */
const CHECKOUT_LIST_LIMIT = 200;

const WORKTREE_KIND = 'worktree';

/**
 * Errnos that mean "this directory was never created", which for a worktree root is the healthy
 * state of a repository that has no worktrees yet — not a degraded scan. Anything else (EACCES,
 * EPERM, …) genuinely may be hiding worktrees and is reported.
 */
const ABSENT_DIRECTORY_ERRNOS = new Set(['ENOENT', 'ENOTDIR']);

/** Accumulator for one worktree while the two sources are being merged. */
interface WorktreeCandidate {
  path: string;
  readonly sources: Set<WorktreeDiscoverySource>;
}

@Injectable()
export class WorktreeDiscoveryService {
  private readonly name = 'worktree-discovery';

  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
    private readonly settingsService: UserWorkspaceSettingsService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Every linked worktree on disk for the user's repositories, plus the root that was
   * scanned and any non-fatal warnings. Never throws: a missing root, an unreadable directory or a
   * failing git probe all degrade to a warning and a partial (possibly empty) list.
   */
  async discover(userId: string): Promise<WorktreeDiscoveryResult> {
    const problems: WorktreeDiscoveryProblem[] = [];
    const scannedAt = new Date().toISOString();

    const checkouts = await this.listCheckouts(userId, problems);
    const registered = this.indexCheckouts(checkouts);
    const primaries = checkouts.filter(
      (checkout) => checkout.kind !== WORKTREE_KIND,
    );

    const candidates = new Map<string, WorktreeCandidate>();
    const notGitRepos = await this.collectFromGitWorktreeList(
      primaries,
      candidates,
      problems,
    );

    // A folder that is not a repository has no worktree root to resolve, and asking would shell out
    // to `git remote get-url origin` only to fall back to the basename.
    const roots = this.resolveRoots(
      primaries.filter(
        (primary) => !notGitRepos.has(realPath(primary.filesystemPath)),
      ),
      problems,
    );
    const scannedRoots = this.collectFromRootScan(roots, candidates, problems);

    const ordered = [...candidates.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    );

    // `git worktree list` keeps reporting deleted worktrees until someone prunes. Gate on existence
    // BEFORE describe(), so one dead path costs one problem rather than three failed git probes.
    const live: WorktreeCandidate[] = [];
    for (const candidate of ordered) {
      if (isExistingDirectory(candidate.path)) {
        live.push(candidate);
        continue;
      }
      problems.push(
        problem(
          WORKTREE_DISCOVERY_PROBLEM.STALE_WORKTREE_ENTRY,
          'reported by `git worktree list` but the directory is gone',
          candidate.path,
        ),
      );
    }

    const kept = live.slice(0, MAX_DISCOVERED_WORKTREES);
    const droppedCount = live.length - kept.length;
    if (droppedCount > 0) {
      problems.push(
        problem(
          WORKTREE_DISCOVERY_PROBLEM.CAP_EXCEEDED,
          `${droppedCount} more were found and not listed`,
        ),
      );
    }

    const worktrees = await Promise.all(
      kept.map((candidate) => this.describe(candidate, registered, problems)),
    );

    const [firstRoot] = roots.entries();

    return {
      droppedCount,
      problems,
      rootSource: firstRoot?.[1] ?? null,
      scannedAt,
      scannedRoots,
      warnings: problems.map(formatWarning),
      worktreeRoot: firstRoot?.[0] ?? null,
      worktrees,
    };
  }

  private async listCheckouts(
    userId: string,
    problems: WorktreeDiscoveryProblem[],
  ): Promise<RepositoryCheckout[]> {
    try {
      return await this.checkoutsService.listByUserId(userId, {
        limit: CHECKOUT_LIST_LIMIT,
      });
    } catch (error) {
      problems.push(
        problem(
          WORKTREE_DISCOVERY_PROBLEM.CHECKOUT_LIST_FAILED,
          message(error),
        ),
      );
      return [];
    }
  }

  /**
   * @description Registered checkouts keyed by resolved real path, so a symlinked worktree root
   * cannot make a registered worktree look unregistered.
   */
  private indexCheckouts(
    checkouts: readonly RepositoryCheckout[],
  ): Map<string, RepositoryCheckout> {
    const index = new Map<string, RepositoryCheckout>();
    for (const checkout of checkouts) {
      index.set(realPath(checkout.filesystemPath), checkout);
    }
    return index;
  }

  /**
   * @description The distinct worktree roots the shared ladder resolves across the user's primary
   * checkouts, each mapped to the rung that answered. Insertion-ordered so the payload's
   * `worktreeRoot` is stable.
   */
  private resolveRoots(
    primaries: readonly RepositoryCheckout[],
    problems: WorktreeDiscoveryProblem[],
  ): Map<string, WorktreeRootSource> {
    const roots = new Map<string, WorktreeRootSource>();

    for (const primary of primaries) {
      try {
        const { resolvedRoot, source } = resolveWorktreeRoot({
          baseCheckoutPath: primary.filesystemPath,
        });
        if (!roots.has(resolvedRoot)) {
          roots.set(resolvedRoot, source);
        }
      } catch (error) {
        problems.push(
          problem(
            WORKTREE_DISCOVERY_PROBLEM.PROBE_FAILED,
            `worktree root resolution: ${message(error)}`,
            primary.filesystemPath,
          ),
        );
      }
    }

    return roots;
  }

  /**
   * Source 1: live `git worktree list --porcelain` from every registered primary checkout.
   *
   * @returns the real paths of registered folders that turned out not to be git repositories at
   * all. That is a per-repository condition — reported once, on the row — not a page-wide warning
   * that reappears on every load.
   */
  private async collectFromGitWorktreeList(
    primaries: readonly RepositoryCheckout[],
    candidates: Map<string, WorktreeCandidate>,
    problems: WorktreeDiscoveryProblem[],
  ): Promise<Set<string>> {
    const notGitRepos = new Set<string>();

    for (const primary of primaries) {
      // eslint-disable-next-line no-await-in-loop
      const { error, stdout } = await this.runGit(primary.filesystemPath, [
        'worktree',
        'list',
        '--porcelain',
      ]);

      if (error !== null) {
        if (isNotAGitRepositoryError(error)) {
          notGitRepos.add(realPath(primary.filesystemPath));
          problems.push(
            problem(
              WORKTREE_DISCOVERY_PROBLEM.NOT_A_GIT_REPO,
              error,
              primary.filesystemPath,
              primary.repositoryId,
            ),
          );
        } else {
          problems.push(
            problem(
              WORKTREE_DISCOVERY_PROBLEM.PROBE_FAILED,
              `git worktree list --porcelain: ${error}`,
              primary.filesystemPath,
            ),
          );
        }
        continue;
      }

      for (const path of parseLinkedWorktrees(stdout)) {
        add(candidates, path, WORKTREE_DISCOVERY_SOURCE.GIT_WORKTREE_LIST);
      }
    }

    return notGitRepos;
  }

  /**
   * Source 2: depth-1 scan of each resolved root for children whose `.git` is a file pointer.
   *
   * @returns one record per root, so the page can report what it actually looked at rather than
   * naming the first root and leaving the rest to be inferred from failures.
   */
  private collectFromRootScan(
    roots: ReadonlyMap<string, WorktreeRootSource>,
    candidates: Map<string, WorktreeCandidate>,
    problems: WorktreeDiscoveryProblem[],
  ): ScannedWorktreeRoot[] {
    const scanned: ScannedWorktreeRoot[] = [];

    for (const [root, source] of roots) {
      let entries: string[];
      try {
        entries = readdirSync(root);
      } catch (error) {
        // A root that was never created is a repository with no worktrees yet — say nothing.
        const absent = isAbsentDirectoryError(error);
        if (!absent) {
          problems.push(
            problem(
              WORKTREE_DISCOVERY_PROBLEM.ROOT_UNREADABLE,
              message(error),
              root,
            ),
          );
        }
        scanned.push({
          exists: !absent,
          path: root,
          source,
          worktreeCount: 0,
        });
        continue;
      }

      let worktreeCount = 0;
      for (const entry of entries) {
        const path = join(root, entry);
        if (!isLinkedWorktreeDirectory(path)) continue;
        add(candidates, path, WORKTREE_DISCOVERY_SOURCE.ROOT_SCAN);
        worktreeCount += 1;
      }

      scanned.push({ exists: true, path: root, source, worktreeCount });
    }

    return scanned;
  }

  /** Runs the per-worktree probes and resolves the owning repository. */
  private async describe(
    candidate: WorktreeCandidate,
    registered: Map<string, RepositoryCheckout>,
    problems: WorktreeDiscoveryProblem[],
  ): Promise<DiscoveredWorktree> {
    const { path } = candidate;
    const checkout = registered.get(path) ?? null;

    const [branch, status, commonDir] = await Promise.all([
      this.git(path, problems, ['branch', '--show-current']),
      this.git(path, problems, ['status', '--porcelain']),
      this.git(path, problems, [
        'rev-parse',
        '--path-format=absolute',
        '--git-common-dir',
      ]),
    ]);

    const resolvedCommonDir =
      commonDir === null || commonDir.trim() === ''
        ? null
        : realPath(commonDir.trim());

    return {
      aheadCount: await this.aheadCount(path),
      branch: branch === null || branch.trim() === '' ? null : branch.trim(),
      checkoutId: checkout?.id ?? null,
      commonDir: resolvedCommonDir,
      dirty: status === null ? null : status.trim() !== '',
      name: basename(path),
      path,
      repositoryId:
        checkout?.repositoryId ??
        this.repositoryForCommonDir(resolvedCommonDir, registered),
      sources: [...candidate.sources],
    };
  }

  /**
   * @description The repository owning a worktree whose own path is unregistered: the common dir is
   * `<primary>/.git`, so its parent is the primary checkout, which may itself be registered.
   */
  private repositoryForCommonDir(
    commonDir: string | null,
    registered: Map<string, RepositoryCheckout>,
  ): string | null {
    if (commonDir === null) return null;
    const primaryPath = realPath(commonDir.replace(/\/\.git\/?$/, ''));
    return registered.get(primaryPath)?.repositoryId ?? null;
  }

  /**
   * @description Commits the branch is ahead of its upstream. A branch with no upstream is the
   * normal case for a fresh worktree, so that yields null rather than a warning.
   */
  private async aheadCount(path: string): Promise<number | null> {
    try {
      const { stdout } = await execFileAsync(
        'git',
        ['-C', path, 'rev-list', '--count', '@{upstream}..HEAD'],
        {
          maxBuffer: GIT_MAX_BUFFER_BYTES,
          timeout: GIT_COMMAND_TIMEOUT_MS,
        },
      );
      const parsed = Number.parseInt(stdout.trim(), 10);
      return Number.isNaN(parsed) ? null : parsed;
    } catch {
      // No upstream configured is the normal case for a fresh worktree branch — not a warning.
      return null;
    }
  }

  /** One read-only git probe; failures return null and append a problem instead of throwing. */
  private async git(
    cwd: string,
    problems: WorktreeDiscoveryProblem[],
    args: readonly string[],
  ): Promise<string | null> {
    const { error, stdout } = await this.runGit(cwd, args);
    if (error === null) return stdout;

    problems.push(
      problem(
        WORKTREE_DISCOVERY_PROBLEM.PROBE_FAILED,
        `git ${args.join(' ')}: ${error}`,
        cwd,
      ),
    );
    return null;
  }

  /**
   * The bounded exec itself, with the failure handed back rather than classified. Callers that need
   * to tell one kind of git failure from another read `error` themselves.
   */
  private async runGit(
    cwd: string,
    args: readonly string[],
  ): Promise<{ error: string | null; stdout: string }> {
    try {
      const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
        maxBuffer: GIT_MAX_BUFFER_BYTES,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      });
      return { error: null, stdout };
    } catch (error) {
      return { error: message(error), stdout: '' };
    }
  }
}

/** Adds or merges a candidate under its symlink-resolved real path. */
const add = (
  candidates: Map<string, WorktreeCandidate>,
  rawPath: string,
  source: WorktreeDiscoverySource,
): void => {
  const path = realPath(rawPath);
  const existing = candidates.get(path);
  if (existing === undefined) {
    candidates.set(path, { path, sources: new Set([source]) });
    return;
  }
  existing.sources.add(source);
};

/** Whether the path is a directory that exists right now. Never throws. */
const isExistingDirectory = (path: string): boolean => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/** A linked worktree's `.git` is a FILE (`gitdir:` pointer); a real clone's is a directory. */
const isLinkedWorktreeDirectory = (path: string): boolean => {
  try {
    if (!statSync(path).isDirectory()) return false;
    return statSync(join(path, '.git')).isFile();
  } catch {
    return false;
  }
};

/** Builds one classified problem; `path` and `repositoryId` default to "not applicable". */
const problem = (
  kind: WorktreeDiscoveryProblemKind,
  detail: string,
  path: string | null = null,
  repositoryId: string | null = null,
): WorktreeDiscoveryProblem => ({ detail, kind, path, repositoryId });

/**
 * The deprecated `warnings` projection: one flat sentence per problem, so existing consumers keep
 * reading the same shape while new ones classify.
 */
const formatWarning = ({
  detail,
  kind,
  path,
}: WorktreeDiscoveryProblem): string => {
  switch (kind) {
    case WORKTREE_DISCOVERY_PROBLEM.CAP_EXCEEDED:
      return `discovery capped at ${MAX_DISCOVERED_WORKTREES} worktrees; ${detail}`;
    case WORKTREE_DISCOVERY_PROBLEM.CHECKOUT_LIST_FAILED:
      return `could not list registered checkouts: ${detail}`;
    case WORKTREE_DISCOVERY_PROBLEM.NOT_A_GIT_REPO:
      return `${path} is registered but is not a git repository: ${detail}`;
    case WORKTREE_DISCOVERY_PROBLEM.ROOT_UNREADABLE:
      return `worktree root ${path} could not be read: ${detail}`;
    case WORKTREE_DISCOVERY_PROBLEM.STALE_WORKTREE_ENTRY:
      return `${path} is still registered with git but no longer exists on disk; run \`git worktree prune\``;
    default:
      return `probe failed in ${path}: ${detail}`;
  }
};

/** git's own wording for "this folder was registered, but it is not a checkout at all". */
const isNotAGitRepositoryError = (detail: string): boolean =>
  /not a git repository/i.test(detail);

/** True when an fs error means the directory does not exist, rather than cannot be read. */
const isAbsentDirectoryError = (error: unknown): boolean =>
  error instanceof Error &&
  'code' in error &&
  typeof error.code === 'string' &&
  ABSENT_DIRECTORY_ERRNOS.has(error.code);

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
