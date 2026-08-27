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
  WorktreeDiscoveryResult,
  WorktreeDiscoverySource,
} from './worktree-discovery.types';
import { WORKTREE_DISCOVERY_SOURCE } from './worktree-discovery.types';

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
    const warnings: string[] = [];
    const scannedAt = new Date().toISOString();

    const settingsWorktreeRoot = await this.configuredRoot(userId, warnings);
    const checkouts = await this.listCheckouts(userId, warnings);
    const registered = this.indexCheckouts(checkouts);
    const primaries = checkouts.filter(
      (checkout) => checkout.kind !== WORKTREE_KIND,
    );

    const roots = this.resolveRoots(primaries, settingsWorktreeRoot, warnings);
    const candidates = new Map<string, WorktreeCandidate>();

    await this.collectFromGitWorktreeList(primaries, candidates, warnings);
    this.collectFromRootScan([...roots.keys()], candidates, warnings);

    const ordered = [...candidates.values()].sort((a, b) =>
      a.path.localeCompare(b.path),
    );
    const kept = ordered.slice(0, MAX_DISCOVERED_WORKTREES);
    const droppedCount = ordered.length - kept.length;
    if (droppedCount > 0) {
      warnings.push(
        `discovery capped at ${MAX_DISCOVERED_WORKTREES} worktrees; ${droppedCount} more were found and not listed`,
      );
    }

    const worktrees = await Promise.all(
      kept.map((candidate) => this.describe(candidate, registered, warnings)),
    );

    const [firstRoot] = roots.entries();

    return {
      droppedCount,
      rootSource: firstRoot?.[1] ?? null,
      scannedAt,
      warnings,
      worktreeRoot: firstRoot?.[0] ?? null,
      worktrees,
    };
  }

  /**
   * @description The user's configured `user_workspace_settings.worktree_root`. Soft-fails to null
   * (letting the ladder's lower rungs answer) rather than failing the page.
   */
  private async configuredRoot(
    userId: string,
    warnings: string[],
  ): Promise<string | null> {
    try {
      const settings = await this.settingsService.getOrCreateForUser(userId);
      return settings.worktreeRoot ?? null;
    } catch (error) {
      warnings.push(
        `could not read the configured worktree root: ${message(error)}`,
      );
      return null;
    }
  }

  private async listCheckouts(
    userId: string,
    warnings: string[],
  ): Promise<RepositoryCheckout[]> {
    try {
      return await this.checkoutsService.listByUserId(userId, {
        limit: CHECKOUT_LIST_LIMIT,
      });
    } catch (error) {
      warnings.push(`could not list registered checkouts: ${message(error)}`);
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
    settingsWorktreeRoot: string | null,
    warnings: string[],
  ): Map<string, WorktreeRootSource> {
    const roots = new Map<string, WorktreeRootSource>();

    for (const primary of primaries) {
      try {
        const { resolvedRoot, source } = resolveWorktreeRoot({
          baseCheckoutPath: primary.filesystemPath,
          settingsWorktreeRoot,
        });
        if (!roots.has(resolvedRoot)) {
          roots.set(resolvedRoot, source);
        }
      } catch (error) {
        warnings.push(
          `could not resolve the worktree root for ${primary.filesystemPath}: ${message(error)}`,
        );
      }
    }

    return roots;
  }

  /** Source 1: live `git worktree list --porcelain` from every registered primary checkout. */
  private async collectFromGitWorktreeList(
    primaries: readonly RepositoryCheckout[],
    candidates: Map<string, WorktreeCandidate>,
    warnings: string[],
  ): Promise<void> {
    for (const primary of primaries) {
      // eslint-disable-next-line no-await-in-loop
      const stdout = await this.git(primary.filesystemPath, warnings, [
        'worktree',
        'list',
        '--porcelain',
      ]);
      for (const path of parseLinkedWorktrees(stdout)) {
        add(candidates, path, WORKTREE_DISCOVERY_SOURCE.GIT_WORKTREE_LIST);
      }
    }
  }

  /** Source 2: depth-1 scan of each resolved root for children whose `.git` is a file pointer. */
  private collectFromRootScan(
    roots: readonly string[],
    candidates: Map<string, WorktreeCandidate>,
    warnings: string[],
  ): void {
    for (const root of roots) {
      let entries: string[];
      try {
        entries = readdirSync(root);
      } catch (error) {
        warnings.push(
          `worktree root ${root} could not be read: ${message(error)}`,
        );
        continue;
      }

      for (const entry of entries) {
        const path = join(root, entry);
        if (!isLinkedWorktreeDirectory(path)) continue;
        add(candidates, path, WORKTREE_DISCOVERY_SOURCE.ROOT_SCAN);
      }
    }
  }

  /** Runs the per-worktree probes and resolves the owning repository. */
  private async describe(
    candidate: WorktreeCandidate,
    registered: Map<string, RepositoryCheckout>,
    warnings: string[],
  ): Promise<DiscoveredWorktree> {
    const { path } = candidate;
    const checkout = registered.get(path) ?? null;

    const [branch, status, commonDir] = await Promise.all([
      this.git(path, warnings, ['branch', '--show-current']),
      this.git(path, warnings, ['status', '--porcelain']),
      this.git(path, warnings, [
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

  /** One read-only git probe; failures return null and append a warning instead of throwing. */
  private async git(
    cwd: string,
    warnings: string[],
    args: readonly string[],
  ): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
        maxBuffer: GIT_MAX_BUFFER_BYTES,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      });
      return stdout;
    } catch (error) {
      warnings.push(
        `git ${args.join(' ')} failed in ${cwd}: ${message(error)}`,
      );
      return null;
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

/** A linked worktree's `.git` is a FILE (`gitdir:` pointer); a real clone's is a directory. */
const isLinkedWorktreeDirectory = (path: string): boolean => {
  try {
    if (!statSync(path).isDirectory()) return false;
    return statSync(join(path, '.git')).isFile();
  } catch {
    return false;
  }
};

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
