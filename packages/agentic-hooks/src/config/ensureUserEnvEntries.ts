/**
 * The writer for `~/.openthrottle/.env` — the user-global layer `readUserEnvFile`
 * reads, and the only way an agent in a foreign checkout finds OpenThrottle now
 * that agent child envs are allowlisted. Every trigger goes through it (server
 * boot, the credential bootstrap, a minted MCP credential, `pnpm run
 * user-env:write`); {@link inspectUserEnvEntries} reads it back under the same
 * rules for the health check. Triggers and skip rules:
 * docs/monorepo/child-repo-hook-telemetry-contract.md § Who writes `~/.openthrottle/.env`.
 *
 * **Fill in, never take over.** The file belongs to the user; the writer owns only
 * the lines it wrote, and it marks each one with {@link USER_ENV_MANAGED_MARKER} on
 * the line directly above (never as a trailing comment: {@link parseEnvLine} keeps
 * everything after `=` as the value, so `KEY=v # managed` would corrupt `v`).
 *
 * The rule is applied per CONCERN, not per key, because the reader accepts aliases.
 * Writing `OPENTHROTTLE_GRAPHQL_URL` next to a user's `OPENTHROTTLE_SERVER_APP_URL`
 * would silently outrank it, so any unmarked key of a concern leaves that whole
 * concern alone:
 *
 * - any user-set (unmarked) key of the concern → untouched;
 * - a managed line for the concern's key with a different value → rewritten in place
 *   (re-running setup rotates the token, and a stale one silently re-buffers);
 * - otherwise → appended, marker first.
 *
 * Every other line, comment and blank line is preserved byte-for-byte. A write
 * leaves the file at mode 600 in a directory created at 700. Never throws.
 */
import fs from 'node:fs';
import path from 'node:path';

import { parseEnvLine, userConfigDir } from './env.ts';

/** The comment line that marks the line below it as writer-owned. @public */
export const USER_ENV_MANAGED_MARKER = '# managed by openthrottle-server';

/** Keys that set the GraphQL endpoint, canonical (the one written) first. @public */
export const USER_ENV_ENDPOINT_KEYS = Object.freeze([
  'OPENTHROTTLE_GRAPHQL_URL',
  'OPENTHROTTLE_WORKER_GRAPHQL_URL',
  'OPENTHROTTLE_SERVER_APP_URL',
] as const);

/** Keys that set the ingest auth token, canonical (the one written) first. @public */
export const USER_ENV_TOKEN_KEYS = Object.freeze([
  'OPENTHROTTLE_MCP_AUTH_TOKEN',
  'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
] as const);

/** What happened to one concern. @public */
export const USER_ENV_CHANGES = Object.freeze({
  /** Absent before; appended as a managed line. */
  ADDED: 'added',
  /** A managed line held a different value; rewritten in place. */
  REFRESHED: 'refreshed',
  /** A managed line already held this value. */
  UNCHANGED: 'unchanged',
  /** The user set it (an unmarked key of the concern); left alone. */
  USER_SET: 'user_set',
} as const);

/** @public */
export type UserEnvChange =
  (typeof USER_ENV_CHANGES)[keyof typeof USER_ENV_CHANGES];

/** The values the writer wants present. @public */
export interface UserEnvEntries {
  readonly authToken: string;
  readonly graphqlUrl: string;
}

/** @public */
export interface UserEnvEntriesSuccess {
  readonly changed: boolean;
  readonly endpoint: UserEnvChange;
  readonly envPath: string;
  readonly ok: true;
  readonly token: UserEnvChange;
}

/** @public */
export interface UserEnvEntriesFailure {
  readonly envPath: string;
  readonly error: string;
  readonly ok: false;
}

/** @public */
export type EnsureUserEnvEntriesResult =
  UserEnvEntriesFailure | UserEnvEntriesSuccess;

interface Concern {
  readonly keys: readonly string[];
  readonly value: string;
}

const isManaged = (lines: readonly string[], index: number): boolean => {
  return index > 0 && lines[index - 1]?.trim() === USER_ENV_MANAGED_MARKER;
};

/** Apply the rule for one concern to `lines`, in place. */
const applyConcern = (lines: string[], concern: Concern): UserEnvChange => {
  const [canonicalKey] = concern.keys;
  const managedIndexes: number[] = [];

  for (const [index, line] of lines.entries()) {
    const assignment = parseEnvLine(line);
    if (!assignment || !concern.keys.includes(assignment.key)) {
      continue;
    }
    if (!isManaged(lines, index)) {
      return USER_ENV_CHANGES.USER_SET;
    }
    if (assignment.key === canonicalKey) {
      managedIndexes.push(index);
    }
  }

  const desired = `${canonicalKey}=${concern.value}`;
  if (managedIndexes.length === 0) {
    lines.push(USER_ENV_MANAGED_MARKER, desired);
    return USER_ENV_CHANGES.ADDED;
  }

  let refreshed = false;
  for (const index of managedIndexes) {
    if (parseEnvLine(lines[index] ?? '')?.value !== concern.value) {
      lines[index] = desired;
      refreshed = true;
    }
  }
  return refreshed ? USER_ENV_CHANGES.REFRESHED : USER_ENV_CHANGES.UNCHANGED;
};

const readExisting = (envPath: string): string => {
  try {
    return fs.readFileSync(envPath, 'utf8');
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return '';
    }
    throw err;
  }
};

const toLines = (text: string): string[] => {
  if (text === '') {
    return [];
  }
  const lines = text.split('\n');
  if (lines.at(-1) === '') {
    lines.pop();
  }
  return lines;
};

/**
 * Write `text` to `envPath` atomically at mode 600, through a symlink rather than
 * over it — a dotfiles-managed `~/.openthrottle/.env` stays a symlink.
 */
const resolveWriteTarget = (envPath: string): string => {
  try {
    return fs.realpathSync(envPath);
  } catch {
    return envPath;
  }
};

const writeAtomically = (envPath: string, text: string): void => {
  const target = resolveWriteTarget(envPath);
  const temp = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.tmp`,
  );
  try {
    fs.writeFileSync(temp, text, { mode: 0o600 });
    fs.chmodSync(temp, 0o600);
    fs.renameSync(temp, target);
  } catch (err) {
    fs.rmSync(temp, { force: true });
    throw err;
  }
};

const isSingleLine = (value: string): boolean => {
  return value.trim() !== '' && !/[\r\n]/.test(value);
};

/** What the file holds for one concern, as the writer's rules see it. @public */
export type UserEnvConcernState =
  | { readonly kind: 'managed'; readonly value: string }
  | { readonly kind: 'missing' }
  | { readonly kind: 'user_set'; readonly value: string };

/** @public */
export interface UserEnvInspection {
  readonly endpoint: UserEnvConcernState;
  readonly envPath: string;
  readonly token: UserEnvConcernState;
}

/** @public */
export interface UserEnvInspectionSuccess extends UserEnvInspection {
  readonly ok: true;
}

/** @public */
export type InspectUserEnvEntriesResult =
  UserEnvEntriesFailure | UserEnvInspectionSuccess;

/**
 * Read one concern under the same rule {@link applyConcern} writes by: the
 * first unmarked key of the concern makes it the user's; otherwise the managed
 * canonical line is ours; otherwise it is missing.
 */
const inspectConcern = (
  lines: readonly string[],
  keys: readonly string[],
): UserEnvConcernState => {
  const [canonicalKey] = keys;
  let managed: string | undefined;

  for (const [index, line] of lines.entries()) {
    const assignment = parseEnvLine(line);
    if (!assignment || !keys.includes(assignment.key)) {
      continue;
    }
    if (!isManaged(lines, index)) {
      return { kind: 'user_set', value: assignment.value.trim() };
    }
    if (assignment.key === canonicalKey && managed === undefined) {
      managed = assignment.value.trim();
    }
  }

  return managed === undefined
    ? { kind: 'missing' }
    : { kind: 'managed', value: managed };
};

/**
 * Read `~/.openthrottle/.env` (or `<configDir>/.env`) without changing it, and
 * say for the endpoint and the token whether each is writer-managed, set by the
 * user or missing. A missing file is two `missing` concerns, not a failure.
 * The values are returned for the caller to check; never log them.
 *
 * @public
 */
export const inspectUserEnvEntries = (
  configDir: string = userConfigDir(),
): InspectUserEnvEntriesResult => {
  const envPath = path.join(configDir, '.env');
  try {
    const lines = toLines(readExisting(envPath));
    return {
      endpoint: inspectConcern(lines, USER_ENV_ENDPOINT_KEYS),
      envPath,
      ok: true,
      token: inspectConcern(lines, USER_ENV_TOKEN_KEYS),
    };
  } catch (err) {
    return {
      envPath,
      error: err instanceof Error ? err.message : String(err),
      ok: false,
    };
  }
};

/**
 * Ensure `~/.openthrottle/.env` (or `<configDir>/.env`) carries the endpoint and
 * token, under the fill-in rule in this module's JSDoc. Returns what happened per
 * concern; a failure is a result, never a throw.
 *
 * @public
 */
export const ensureUserEnvEntries = (
  entries: UserEnvEntries,
  configDir: string = userConfigDir(),
): EnsureUserEnvEntriesResult => {
  const envPath = path.join(configDir, '.env');

  if (!isSingleLine(entries.graphqlUrl) || !isSingleLine(entries.authToken)) {
    return {
      envPath,
      error: 'graphqlUrl and authToken must be non-empty single-line values',
      ok: false,
    };
  }

  try {
    const lines = toLines(readExisting(envPath));
    const endpoint = applyConcern(lines, {
      keys: USER_ENV_ENDPOINT_KEYS,
      value: entries.graphqlUrl.trim(),
    });
    const token = applyConcern(lines, {
      keys: USER_ENV_TOKEN_KEYS,
      value: entries.authToken.trim(),
    });

    const changed = [endpoint, token].some((change) => {
      return (
        change === USER_ENV_CHANGES.ADDED ||
        change === USER_ENV_CHANGES.REFRESHED
      );
    });
    if (changed) {
      fs.mkdirSync(configDir, { mode: 0o700, recursive: true });
      writeAtomically(envPath, `${lines.join('\n')}\n`);
    }

    return { changed, endpoint, envPath, ok: true, token };
  } catch (err) {
    return {
      envPath,
      error: err instanceof Error ? err.message : String(err),
      ok: false,
    };
  }
};
