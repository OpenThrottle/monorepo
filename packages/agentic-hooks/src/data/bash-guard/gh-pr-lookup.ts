/**
 * The real {@link PullRequestLookup}: ask the GitHub CLI for one pull
 * request's state.
 *
 * Runs `gh pr view [<selector>] [--repo <repo>] --json
 * state,number,mergedAt,closedAt` in the command's directory, bounded by a
 * timeout. Anything short of a clean, well-formed answer — gh missing, not
 * authenticated, no such PR, a timeout, unexpected JSON — is `unknown`, so the
 * rule that asked fails open.
 *
 * Only ever invoked for a command a rule already parsed as a guarded write:
 * every other command finishes without spawning a process.
 *
 * @public
 */
import { execFile } from 'node:child_process';

import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  PullRequestLookup,
  PullRequestQuery,
  PullRequestState,
} from './types.ts';

/**
 * Runs a binary and resolves its stdout; rejects on a non-zero exit, a spawn
 * failure or a timeout.
 *
 * @public
 */
export type RunFile = (
  file: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly timeoutMs: number },
) => Promise<string>;

/** @public */
export const GH_PR_LOOKUP_TIMEOUT_MS = 3000;

const UNKNOWN: PullRequestState = { kind: 'unknown' };

/** @public */
export const runFile: RunFile = (file, args, { cwd, timeoutMs }) => {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      [...args],
      {
        cwd,
        env: { ...process.env, GH_PROMPT_DISABLED: '1', NO_COLOR: '1' },
        maxBuffer: 1024 * 1024,
        timeout: timeoutMs,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) reject(error);
        else resolve(String(stdout));
      },
    );
  });
};

/**
 * The `gh pr view` arguments for `query`.
 *
 * @public
 */
export const ghPrViewArgs = (query: PullRequestQuery): readonly string[] => {
  return [
    'pr',
    'view',
    ...(query.selector === null ? [] : [query.selector]),
    ...(query.repo === null ? [] : ['--repo', query.repo]),
    '--json',
    'closedAt,mergedAt,number,state',
  ];
};

const readTimestamp = (value: unknown): string | null => {
  return typeof value === 'string' && value !== '' ? value : null;
};

/**
 * Map `gh pr view --json closedAt,mergedAt,number,state` output to a
 * {@link PullRequestState}. `changedAt` is when it merged, for a merged PR, or
 * when it closed otherwise; an open PR has none.
 *
 * @public
 */
export const parseGhPrView = (stdout: string): PullRequestState => {
  let payload: unknown;
  try {
    payload = JSON.parse(stdout);
  } catch {
    return UNKNOWN;
  }
  if (!isRecord(payload)) return UNKNOWN;

  const { closedAt, mergedAt, number, state } = payload;
  if (typeof state !== 'string' || typeof number !== 'number') return UNKNOWN;

  let changedAt: string | null = null;
  if (state === 'MERGED') changedAt = readTimestamp(mergedAt);
  else if (state === 'CLOSED') changedAt = readTimestamp(closedAt);

  return { changedAt, kind: 'found', number, state };
};

/**
 * Build a {@link PullRequestLookup} backed by the GitHub CLI.
 *
 * @public
 */
export const createGhPrLookup = ({
  binary = 'gh',
  run = runFile,
  timeoutMs = GH_PR_LOOKUP_TIMEOUT_MS,
}: {
  readonly binary?: string;
  readonly run?: RunFile;
  readonly timeoutMs?: number;
} = {}): PullRequestLookup => {
  return async (query) => {
    try {
      const stdout = await run(binary, ghPrViewArgs(query), {
        cwd: query.cwd,
        timeoutMs,
      });
      return parseGhPrView(stdout);
    } catch {
      return UNKNOWN;
    }
  };
};
