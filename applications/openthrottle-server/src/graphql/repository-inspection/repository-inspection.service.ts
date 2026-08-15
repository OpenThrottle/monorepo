/**
 * @description Read-only, bounded, timeboxed scan of a registered checkout
 * path: OT-manifest identity anchor, git state, stack markers, and agent
 * config presence. Root-level checks only — no recursive tree walks. The
 * snapshot persists to repository_checkouts.inspection via
 * RepositoryCheckoutsService (DB is a cache; disk is the source of truth).
 * Pattern precedent: agent-discovery / model-discovery cached snapshots.
 */

import { execFile } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { promisify } from 'node:util';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  normalizeRemoteUrl,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { isRecord } from '@openthrottle/nodejs-utils';
import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';
import type {
  RepositoryInspectionAgentConfig,
  RepositoryInspectionGit,
  RepositoryInspectionManifest,
  RepositoryInspectionRemote,
  RepositoryInspectionSnapshot,
  RepositoryInspectionStack,
} from './repository-inspection.snapshot';

const execFileAsync = promisify(execFile);

/** Per-git-command timebox; a scan runs a handful of these sequentially. */
const GIT_COMMAND_TIMEOUT_MS = 2_000;

/** Cap on stdout per git command (worktree/status lists stay bounded). */
const GIT_MAX_BUFFER_BYTES = 1024 * 1024;

const MAX_PATH_LENGTH = 4096;

const OPENTHROTTLE_MANIFEST_RELATIVE_PATH = `.openthrottle/workspace-editors.json`;

/** Root-level marker files → language tags. Root checks only, no walks. */
const LANGUAGE_MARKERS: ReadonlyArray<readonly [string, string]> = [
  ['Cargo.toml', 'rust'],
  ['Gemfile', 'ruby'],
  ['go.mod', 'go'],
  ['package.json', 'javascript'],
  ['pom.xml', 'java'],
  ['pyproject.toml', 'python'],
  ['requirements.txt', 'python'],
  ['tsconfig.json', 'typescript'],
];

const PACKAGE_MANAGER_LOCKFILES: ReadonlyArray<readonly [string, string]> = [
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
];

const SKILLS_DIRECTORIES = ['.agents/skills', '.claude/skills', 'skills'];

/**
 * Validates a path before any filesystem access: absolute, sane length, no
 * NUL bytes, exists, and is a directory — the validateWorkingDirectory-style
 * checks from the design doc §6. Comparison happens in this process's view
 * (toContainerPath); the returned value is the resolved, process-view path.
 */
export const validateInspectionPath = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.includes('\0')) {
    throw new Error('inspection path is empty or contains invalid characters');
  }
  if (trimmed.length > MAX_PATH_LENGTH) {
    throw new Error(
      `inspection path must be at most ${MAX_PATH_LENGTH} characters`,
    );
  }
  if (!isAbsolute(trimmed)) {
    throw new Error('inspection path must be an absolute path');
  }

  const resolved = toContainerPath(trimmed);
  if (!existsSync(resolved)) {
    throw new Error(`inspection path does not exist: ${trimmed}`);
  }
  if (!statSync(resolved).isDirectory()) {
    throw new Error(`inspection path is not a directory: ${trimmed}`);
  }

  return resolved;
};

@Injectable()
export class RepositoryInspectionService {
  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutsService: RepositoryCheckoutsService,
  ) {
    this.logger.debug('🧩 repository-inspection 🧩');
  }

  /**
   * @description Scans a checkout path and returns the snapshot. Read-only;
   * every git probe is individually timeboxed and failures degrade to nulls
   * plus a warning instead of failing the scan.
   */
  async scan(filesystemPath: string): Promise<RepositoryInspectionSnapshot> {
    const root = validateInspectionPath(filesystemPath);
    const warnings: string[] = [];

    const [git, manifest] = await Promise.all([
      this.inspectGit(root, warnings),
      this.readManifest(root, warnings),
    ]);

    return {
      agentConfig: this.inspectAgentConfig(root),
      git,
      manifest,
      scannedAt: new Date().toISOString(),
      stack: this.inspectStack(root),
      warnings,
    };
  }

  /**
   * @description Scans a checkout path and persists the snapshot + scannedAt
   * onto the repository_checkouts row.
   */
  async scanAndPersist(
    checkoutId: string,
    filesystemPath: string,
  ): Promise<RepositoryInspectionSnapshot> {
    const snapshot = await this.scan(filesystemPath);
    await this.checkoutsService.saveInspection(
      checkoutId,
      // JSONB column is typed as a plain record; the snapshot is JSON-safe.
      { ...snapshot },
      new Date(snapshot.scannedAt),
    );
    return snapshot;
  }

  /**
   * @description Reads only the OT-manifest identity anchor from a folder
   * (no git probes) — used to annotate discovered folders cheaply. The path
   * must already be validated; pass the process-view path.
   */
  async readManifestIdentity(
    root: string,
  ): Promise<RepositoryInspectionManifest> {
    return this.readManifest(root, []);
  }

  private inspectAgentConfig(root: string): RepositoryInspectionAgentConfig {
    return {
      agentsMd: existsSync(join(root, 'AGENTS.md')),
      claudeMd: existsSync(join(root, 'CLAUDE.md')),
      cursorRules: existsSync(join(root, '.cursor/rules')),
      mcpJson: existsSync(join(root, '.mcp.json')),
      skillsDir: SKILLS_DIRECTORIES.some((dir) => existsSync(join(root, dir))),
    };
  }

  private inspectStack(root: string): RepositoryInspectionStack {
    const languages = [
      ...new Set(
        LANGUAGE_MARKERS.filter(([marker]) =>
          existsSync(join(root, marker)),
        ).map(([, language]) => language),
      ),
    ];

    const packageManager =
      PACKAGE_MANAGER_LOCKFILES.find(([lockfile]) =>
        existsSync(join(root, lockfile)),
      )?.[1] ?? null;

    return {
      languages,
      nxWorkspace: existsSync(join(root, 'nx.json')),
      packageManager,
      pnpmWorkspace: existsSync(join(root, 'pnpm-workspace.yaml')),
      turbo: existsSync(join(root, 'turbo.json')),
    };
  }

  private async inspectGit(
    root: string,
    warnings: string[],
  ): Promise<RepositoryInspectionGit> {
    const notARepo: RepositoryInspectionGit = {
      currentBranch: null,
      defaultBranch: null,
      dirty: null,
      isLinkedWorktree: false,
      isRepo: false,
      linkedWorktrees: [],
      normalizedRemoteUrl: null,
      remotes: [],
    };

    // `.git` is a directory for primary checkouts and a file for worktrees.
    const dotGit = join(root, '.git');
    if (!existsSync(dotGit)) {
      return notARepo;
    }
    // A linked worktree's `.git` is a file (`gitdir: ...` pointer), not a dir.
    const isLinkedWorktree = (() => {
      try {
        return statSync(dotGit).isFile();
      } catch {
        return false;
      }
    })();

    const insideWorkTree = await this.git(root, warnings, [
      'rev-parse',
      '--is-inside-work-tree',
    ]);
    if (insideWorkTree?.trim() !== 'true') {
      return notARepo;
    }

    const remotes = this.parseRemotes(
      await this.git(root, warnings, ['remote', '-v']),
    );
    const originUrl =
      remotes.find((remote) => remote.name === 'origin')?.url ??
      remotes[0]?.url ??
      null;

    const defaultBranchRef = await this.git(root, warnings, [
      'symbolic-ref',
      '--short',
      'refs/remotes/origin/HEAD',
    ]);
    const currentBranch = await this.git(root, warnings, [
      'branch',
      '--show-current',
    ]);
    const status = await this.git(root, warnings, ['status', '--porcelain']);
    const worktrees = await this.git(root, warnings, [
      'worktree',
      'list',
      '--porcelain',
    ]);

    return {
      currentBranch:
        currentBranch === null || currentBranch.trim() === ''
          ? null
          : currentBranch.trim(),
      defaultBranch:
        defaultBranchRef === null
          ? null
          : (defaultBranchRef.trim().split('/').pop() ?? null),
      dirty: status === null ? null : status.trim() !== '',
      isLinkedWorktree,
      isRepo: true,
      linkedWorktrees: this.parseLinkedWorktrees(worktrees),
      normalizedRemoteUrl:
        originUrl === null ? null : normalizeRemoteUrl(originUrl),
      remotes,
    };
  }

  private parseRemotes(output: string | null): RepositoryInspectionRemote[] {
    if (output === null) return [];
    const seen = new Map<string, string>();
    for (const line of output.split('\n')) {
      const match = /^(\S+)\t(\S+)\s+\(fetch\)$/.exec(line.trim());
      if (match && !seen.has(match[1])) {
        seen.set(match[1], match[2]);
      }
    }
    return [...seen.entries()].map(([name, url]) => ({ name, url }));
  }

  private parseLinkedWorktrees(output: string | null): string[] {
    if (output === null) return [];
    return (
      output
        .split('\n')
        .filter((line) => line.startsWith('worktree '))
        .map((line) => line.slice('worktree '.length).trim())
        .filter((path) => path !== '')
        // git lists the main worktree first; only the linked ones matter.
        .slice(1)
    );
  }

  private async readManifest(
    root: string,
    warnings: string[],
  ): Promise<RepositoryInspectionManifest> {
    const absent: RepositoryInspectionManifest = {
      checkoutId: null,
      present: false,
      repositoryId: null,
    };

    const manifestPath = join(root, OPENTHROTTLE_MANIFEST_RELATIVE_PATH);
    if (!existsSync(manifestPath)) {
      return absent;
    }

    try {
      const manifest: unknown = JSON.parse(
        await readFile(manifestPath, 'utf-8'),
      );
      if (!isRecord(manifest)) {
        warnings.push('OT manifest is not a JSON object');
        return { ...absent, present: true };
      }
      return {
        checkoutId:
          typeof manifest.checkoutId === 'string' ? manifest.checkoutId : null,
        present: true,
        repositoryId:
          typeof manifest.repositoryId === 'string'
            ? manifest.repositoryId
            : null,
      };
    } catch {
      warnings.push('OT manifest could not be read or parsed');
      return { ...absent, present: true };
    }
  }

  /**
   * Runs one read-only git command with a hard timeout; failures and timeouts
   * return null and append a warning instead of throwing.
   */
  private async git(
    root: string,
    warnings: string[],
    args: readonly string[],
  ): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync('git', ['-C', root, ...args], {
        maxBuffer: GIT_MAX_BUFFER_BYTES,
        timeout: GIT_COMMAND_TIMEOUT_MS,
      });
      return stdout;
    } catch {
      // Expected for e.g. symbolic-ref on repos without origin/HEAD; only
      // note probes that matter for completeness.
      if (args[0] !== 'symbolic-ref') {
        warnings.push(`git ${args[0]} probe failed or timed out`);
      }
      return null;
    }
  }
}
