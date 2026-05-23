/**
 * Parent job: acquire a worktree target and create a branch for the child (Ralph) job.
 * After child completes, ensure working tree is clean and (optionally) CI-aligned nx checks pass before release.
 */

import { spawn, spawnSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import type {
  ChildJobStreamChunk,
  IWorktreeTargetsTracker,
  ParentJobAcquireOptions,
  ParentJobAcquireResult,
  ParentJobEnsureCommitOptions,
  ParentJobEnsureCommitResult,
  ParentJobHandoff,
} from '../types/worktree';

/** Grace period in ms after SIGTERM before sending SIGKILL (align with child-job). */
const SIGKILL_GRACE_MS = 10_000;

interface NxSpawnResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly killReason?: 'timeout' | 'abort';
}

const DEFAULT_BASE_BRANCH = 'main';

/** Maximum length for the slugified plan title portion of the branch name. */
const MAX_SLUG_LENGTH = 50;

/**
 * @description Converts a plan title to a valid git branch name slug.
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Trims hyphens from start/end
 * - Truncates to max 50 characters (leaving room for ralph/ prefix and uniqueness suffix)
 */
export function slugifyForBranch(title: string): string {
  if (!title || title.trim().length === 0) {
    return '';
  }

  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/, '');
}

/** Length of the uniqueness suffix appended to slugified plan titles. */
const UNIQUENESS_SUFFIX_LENGTH = 6;

/**
 * @description Derives a unique branch name. When planTitle is provided, uses
 * `ralph/{slugified-title}-{suffix}` format (e.g., `ralph/human-readable-branch-names-a1b2c3`).
 * Falls back to `ralph/{lockedBy-slug}-{timestamp}` when no title is provided.
 */
export function deriveBranchName(lockedBy: string, planTitle?: string): string {
  if (planTitle) {
    const slug = slugifyForBranch(planTitle);
    if (slug.length > 0) {
      const suffix = Date.now().toString(36).slice(-UNIQUENESS_SUFFIX_LENGTH);
      return `ralph/${slug}-${suffix}`;
    }
  }

  const slug = lockedBy.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 12);
  return `ralph/${slug}-${Date.now()}`;
}

/**
 * @description Creates a new branch in the worktree at worktreePath. Returns true on success.
 */
export function createBranchInWorktree(
  worktreePath: string,
  branchName: string,
  baseBranch: string,
): { ok: true } | { ok: false; stderr: string } {
  const child = spawnSync(
    'git',
    ['-C', worktreePath, 'checkout', '-b', branchName, baseBranch],
    { encoding: 'utf-8' },
  );
  if (child.status === 0) {
    return { ok: true };
  }
  const stderr = (
    child.stderr ??
    child.error?.message ??
    'unknown error'
  ).trim();
  return { ok: false, stderr };
}

/**
 * @description Parent job step: acquire an available worktree target (lock it) and create
 * a new branch there. Returns handoff data for the child job or failure.
 * On create-branch failure, the target is released before returning.
 * Supports both sync and async tracker implementations (mutex-protected or Redis-backed).
 */
export async function parentJobAcquireAndCreateBranch(
  tracker: IWorktreeTargetsTracker,
  options: ParentJobAcquireOptions,
): Promise<ParentJobAcquireResult> {
  const {
    lockedBy,
    baseBranch = DEFAULT_BASE_BRANCH,
    branchName: explicitBranch,
    planTitle,
    worktreeId,
  } = options;

  const acquireResult = await tracker.acquire({
    id: worktreeId,
    lockedBy,
  });
  if (!acquireResult.ok) {
    return {
      detail: acquireResult.reason,
      ok: false,
      reason: 'acquire_failed',
    };
  }

  const { id: targetId, path: worktreePath } = acquireResult.target;
  const branchName = explicitBranch ?? deriveBranchName(lockedBy, planTitle);

  const branchResult = createBranchInWorktree(
    worktreePath,
    branchName,
    baseBranch,
  );
  if (!branchResult.ok) {
    await tracker.release({ id: targetId, lockedBy });
    return {
      detail: branchResult.stderr,
      ok: false,
      reason: 'create_branch_failed',
    };
  }

  const handoff: ParentJobHandoff = {
    branchName,
    targetId,
    worktreePath,
  };
  return { handoff, ok: true };
}

/**
 * @description Returns true if the worktree has no uncommitted changes (clean).
 */
export function isWorktreeClean(worktreePath: string): boolean {
  const child = spawnSync(
    'git',
    ['-C', worktreePath, 'status', '--porcelain'],
    { encoding: 'utf-8' },
  );
  if (child.status !== 0) return false;
  const out = (child.stdout ?? '').trim();
  return out.length === 0;
}

/** Nx targets run by ensureCommit; aligned with CI (`continuous-integration.yml`). */
export const ENSURE_COMMIT_NX_CHECKS = [
  'lint',
  'typecheck',
  'typecheck-tests',
] as const;

export type EnsureCommitNxCheck = (typeof ENSURE_COMMIT_NX_CHECKS)[number];

/**
 * @description Runs a single nx check (lint, typecheck, or typecheck-tests) with spawn + Promise.
 * Supports optional timeout, AbortSignal, and onChunk for progress.
 */
function runNxCheckAsync(
  worktreePath: string,
  args: string[],
  options: {
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
    readonly onChunk?: (chunk: ChildJobStreamChunk) => void;
  },
): Promise<NxSpawnResult> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn('pnpm', args, {
      cwd: worktreePath,
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let killReason: 'timeout' | 'abort' | undefined;
    let resolved = false;

    const push = (stream: 'stdout' | 'stderr', data: string): void => {
      if (stream === 'stdout') stdout += data;
      else stderr += data;
      options.onChunk?.({ data, stream });
    };

    if (child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => push('stdout', chunk));
    }
    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk: string) => push('stderr', chunk));
    }

    const killChild = (reason: 'timeout' | 'abort'): void => {
      if (killReason !== undefined) return;
      killReason = reason;
      if (child.killed) return;
      child.kill('SIGTERM');
      const killTimeout = setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          /* process may have exited */
        }
      }, SIGKILL_GRACE_MS);
      child.once('close', () => clearTimeout(killTimeout));
    };

    const onAbort = (): void => {
      if (options.signal?.aborted) killChild('abort');
    };

    const done = (
      status: number | null,
      signal: NodeJS.Signals | null,
    ): void => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      options.signal?.removeEventListener('abort', onAbort);
      resolve({
        killReason,
        signal,
        status,
        stderr,
        stdout,
      });
    };

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (options.timeoutMs !== undefined && options.timeoutMs > 0) {
      timeoutId = setTimeout(() => killChild('timeout'), options.timeoutMs);
    }

    options.signal?.addEventListener('abort', onAbort);
    if (options.signal?.aborted) {
      killChild('abort');
    }

    child.on('close', (code, sig) => done(code ?? null, sig ?? null));
    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        options.signal?.removeEventListener('abort', onAbort);
        reject(err);
      }
    });
  });
}

/**
 * @description Runs CI-aligned nx checks in the worktree (spawn + Promise).
 * Uses nx affected when base is set. Supports optional timeoutMs, signal, and onChunk.
 */
async function runLintTestTypecheck(
  worktreePath: string,
  base: string | undefined,
  options: {
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
    readonly onChunk?: (chunk: ChildJobStreamChunk) => void;
  } = {},
): Promise<ParentJobEnsureCommitResult> {
  for (const check of ENSURE_COMMIT_NX_CHECKS) {
    const args =
      base !== undefined && base.length > 0
        ? ['exec', 'nx', 'affected', '-t', check, '--base', base, '--parallel']
        : ['exec', 'nx', 'run-many', '-t', check, '--parallel'];
    // eslint-disable-next-line no-await-in-loop -- checks must run sequentially (lint then test then build)
    const result = await runNxCheckAsync(worktreePath, args, options);
    const stderrTrimmed = result.stderr.trim();
    const stdoutTrimmed = result.stdout.trim();
    if (result.killReason === 'timeout') {
      return {
        ok: false,
        reason: 'checks_timed_out',
        stderr: stderrTrimmed || undefined,
        stdout: stdoutTrimmed || undefined,
      };
    }
    if (result.killReason === 'abort') {
      return {
        ok: false,
        reason: 'checks_cancelled',
        stderr: stderrTrimmed || undefined,
        stdout: stdoutTrimmed || undefined,
      };
    }
    if (result.status !== 0) {
      return {
        check,
        ok: false,
        reason: 'checks_failed',
        stderr: stderrTrimmed || undefined,
        stdout: stdoutTrimmed || undefined,
      };
    }
  }
  return { ok: true };
}

/**
 * @description Parent job step: after child completes, ensure all changes are committed and
 * (optionally) lint/typecheck/typecheck-tests pass before the caller releases the worktree target.
 * Call this before releasing the target; on success, release the target.
 * Nx checks run via spawn + Promise with optional timeout, AbortSignal, and onChunk for progress.
 */
export async function parentJobEnsureCommitBeforeRelease(
  handoff: ParentJobHandoff,
  options: ParentJobEnsureCommitOptions = {},
): Promise<ParentJobEnsureCommitResult> {
  const { worktreePath } = handoff;
  const { base, runChecks = true, timeoutMs, signal, onChunk } = options;

  if (!isWorktreeClean(worktreePath)) {
    const child = spawnSync('git', ['-C', worktreePath, 'status', '--short'], {
      encoding: 'utf-8',
    });
    const detail = child.stdout?.trim() || undefined;
    return {
      detail,
      ok: false,
      reason: 'working_tree_dirty',
    };
  }

  if (!runChecks) {
    return { ok: true };
  }

  return runLintTestTypecheck(worktreePath, base, {
    onChunk,
    signal,
    timeoutMs,
  });
}
