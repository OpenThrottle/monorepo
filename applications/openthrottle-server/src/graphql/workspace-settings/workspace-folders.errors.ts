/**
 * @description Operator-fixable failures of the add-folder / clone pipeline,
 * raised as `GraphQLError`s carrying a stable `extensions.code`. The central
 * `formatError` (`@openthrottle/nestjs-graphql`) only masks errors Apollo
 * classified as `INTERNAL_SERVER_ERROR`; a `GraphQLError` with its own code is
 * a deliberate error and its message survives `NODE_ENV=production`. Anything
 * not classified here stays a plain `Error` and is still masked.
 */

import { isRecord } from '@openthrottle/nodejs-utils';
import { GraphQLError } from 'graphql';

/**
 * @description Stable `extensions.code` values for workspace-folder failures.
 * Clients branch on these (never on message text).
 * @public
 */
export const WorkspaceFolderErrorCode = {
  CHECKOUT_ROOT_NOT_CONFIGURED: 'CHECKOUT_ROOT_NOT_CONFIGURED',
  CHECKOUT_ROOT_NOT_WRITABLE: 'CHECKOUT_ROOT_NOT_WRITABLE',
  GIT_CLONE_AUTH_FAILED: 'GIT_CLONE_AUTH_FAILED',
  GIT_CLONE_FAILED: 'GIT_CLONE_FAILED',
  GIT_NOT_INSTALLED: 'GIT_NOT_INSTALLED',
  GIT_URL_INVALID: 'GIT_URL_INVALID',
  WORKSPACE_PATH_NOT_ABSOLUTE: 'WORKSPACE_PATH_NOT_ABSOLUTE',
  WORKSPACE_PATH_NOT_FOUND: 'WORKSPACE_PATH_NOT_FOUND',
  WORKSPACE_PATH_NOT_READABLE: 'WORKSPACE_PATH_NOT_READABLE',
  WORKSPACE_PATH_OUTSIDE_ROOTS: 'WORKSPACE_PATH_OUTSIDE_ROOTS',
  WORKSPACE_ROOTS_NOT_CONFIGURED: 'WORKSPACE_ROOTS_NOT_CONFIGURED',
} as const;

export type WorkspaceFolderErrorCode =
  (typeof WorkspaceFolderErrorCode)[keyof typeof WorkspaceFolderErrorCode];

/**
 * @description A user-facing workspace-folder failure. The message is shown to
 * the operator as-is, so it must say what to change and must not embed
 * secrets or server internals.
 * @public
 */
export class WorkspaceFolderError extends GraphQLError {
  readonly code: WorkspaceFolderErrorCode;

  constructor(code: WorkspaceFolderErrorCode, message: string) {
    super(message, { extensions: { code } });
    this.name = 'WorkspaceFolderError';
    this.code = code;
  }
}

/**
 * @description Node errno `code` (e.g. `ENOENT`, `EACCES`) of a thrown value,
 * or undefined when it is not an errno-style error.
 */
const errnoCodeOf = (error: unknown): string | undefined =>
  isRecord(error) && typeof error.code === 'string' ? error.code : undefined;

/** Filesystem errnos meaning "this process is not allowed to touch it". */
const PERMISSION_ERRNOS: ReadonlySet<string> = new Set([
  'EACCES',
  'EPERM',
  'EROFS',
]);

/** Filesystem errnos meaning "the path is not (or no longer) a directory". */
const MISSING_ERRNOS: ReadonlySet<string> = new Set(['ENOENT', 'ENOTDIR']);

/**
 * @description Classify a `readdir` failure on a path already validated to sit
 * under a workspace root. Returns a user-facing error for permission and
 * missing-path failures and `undefined` for anything else (which the caller
 * rethrows so it stays masked).
 */
export const classifyReadDirectoryFailure = (
  error: unknown,
  path: string,
): WorkspaceFolderError | undefined => {
  const code = errnoCodeOf(error);
  if (code !== undefined && PERMISSION_ERRNOS.has(code)) {
    return new WorkspaceFolderError(
      WorkspaceFolderErrorCode.WORKSPACE_PATH_NOT_READABLE,
      `The OpenThrottle server is not allowed to read ${path}. Grant the user running the server read access to it, or browse a different folder.`,
    );
  }
  if (code !== undefined && MISSING_ERRNOS.has(code)) {
    return new WorkspaceFolderError(
      WorkspaceFolderErrorCode.WORKSPACE_PATH_NOT_FOUND,
      `${path} is not a directory that exists on the server host.`,
    );
  }
  return undefined;
};

/**
 * @description Classify a failure creating the managed checkout root. Returns
 * a user-facing error for permission failures and `undefined` otherwise.
 */
export const classifyCheckoutRootFailure = (
  error: unknown,
  root: string,
): WorkspaceFolderError | undefined => {
  const code = errnoCodeOf(error);
  if (code === undefined) return undefined;
  if (PERMISSION_ERRNOS.has(code) || code === 'ENOTDIR' || code === 'EEXIST') {
    return new WorkspaceFolderError(
      WorkspaceFolderErrorCode.CHECKOUT_ROOT_NOT_WRITABLE,
      `The OpenThrottle server cannot create or write to its checkout root ${root}. Point OPENTHROTTLE_CHECKOUT_ROOT at a directory the server user can write to.`,
    );
  }
  return undefined;
};

/** Phrases git / ssh print when credentials are missing or rejected. */
const GIT_AUTH_FAILURE_PATTERNS: readonly RegExp[] = [
  /authentication failed/i,
  /could not read (?:username|password)/i,
  /host key verification failed/i,
  /permission denied \((?:publickey|keyboard-interactive|password)/i,
  /repository not found/i,
  /terminal prompts disabled/i,
  /the requested url returned error: 40[13]/i,
  // GitHub over HTTPS: a token without access to the repo gets a 403 / "denied to <user>",
  // a bad or expired one gets "Invalid username or token" / 401.
  /permission to \S+ denied to/i,
  /invalid username or (?:password|token)/i,
  /(?:support for )?password authentication (?:was removed|is not supported)/i,
  // Anonymous or under-scoped HTTPS reports a private repo as missing.
  /repository '[^']*' not found/i,
];

/** Cap on how much git stderr is echoed back to the client. */
const GIT_STDERR_MAX_CHARS = 500;

/**
 * @description Reduce raw git stderr to a client-safe snippet: drops the
 * `Cloning into '<path>'` line (it names a server path), redacts any
 * `user:token@` credentials embedded in URLs, and bounds the length.
 */
const sanitizeGitStderr = (stderr: string): string =>
  stderr
    .split('\n')
    .filter((line) => !/^cloning into /i.test(line.trim()))
    .join('\n')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi, '$1***@')
    .trim()
    .slice(0, GIT_STDERR_MAX_CHARS);

/**
 * @description Turn the rejection of `git clone` into a user-facing error: a
 * missing `git` binary (spawn ENOENT), a credential failure (OT clones with
 * ambient host credentials only), a timeout, or a generic clone failure that
 * echoes a sanitized git stderr. Always returns an error — a failed clone is
 * an operator-visible condition, never an "Internal server error".
 */
export const classifyGitCloneFailure = (
  error: unknown,
  timeoutMs: number,
): WorkspaceFolderError => {
  if (errnoCodeOf(error) === 'ENOENT') {
    return new WorkspaceFolderError(
      WorkspaceFolderErrorCode.GIT_NOT_INSTALLED,
      'The git executable was not found on the OpenThrottle server host. Install git (or add it to the PATH of the server process) and try again.',
    );
  }

  const stderr =
    isRecord(error) && typeof error.stderr === 'string'
      ? sanitizeGitStderr(error.stderr)
      : '';

  if (GIT_AUTH_FAILURE_PATTERNS.some((pattern) => pattern.test(stderr))) {
    return new WorkspaceFolderError(
      WorkspaceFolderErrorCode.GIT_CLONE_AUTH_FAILED,
      `git clone failed: authentication was rejected or the repository is not accessible. OpenThrottle stores no credentials of its own and clones with the server host's ambient credentials. For GitHub, set GITHUB_TOKEN (a token that can read this repository) on the server so the gh credential helper is configured at startup, or run \`gh auth login\` and \`gh auth setup-git\` as the server user; otherwise make sure the host can already clone this URL.${stderr === '' ? '' : ` git said: ${stderr}`}`,
    );
  }

  if (isRecord(error) && error.killed === true) {
    return new WorkspaceFolderError(
      WorkspaceFolderErrorCode.GIT_CLONE_FAILED,
      `git clone failed: it did not finish within ${String(Math.round(timeoutMs / 60_000))} minutes and was stopped.`,
    );
  }

  return new WorkspaceFolderError(
    WorkspaceFolderErrorCode.GIT_CLONE_FAILED,
    `git clone failed${stderr === '' ? '.' : `: ${stderr}`}`,
  );
};
