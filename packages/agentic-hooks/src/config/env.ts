/**
 * Env + git resolution, keyed on WHERE a value lives rather than on what it is
 * called. One vocabulary — `OPENTHROTTLE_*` — at every layer:
 *
 * 1. `<repoRoot>/.env`, and only when repoRoot is an OpenThrottle checkout.
 *    A worktree's own `.env` beats the ambient shell on purpose: an OT worktree
 *    runs its own server on its own port, and a stale parent shell would
 *    otherwise divert this worktree's capture to a sibling's (or a
 *    pre-migration) schema.
 * 2. `process.env` — the ambient shell.
 * 3. `~/.openthrottle/.env` — the user-global fallback, which is what makes
 *    telemetry configurable from a foreign repo without writing anything into
 *    it.
 *
 * The repo layer is gated because the plugin ships to other people's
 * repositories: outside an OT checkout we never open their `.env` at all.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { logHookError } from '../utils/logging.ts';

/**
 * The user-global config directory. Also the home of the buffered telemetry
 * written when no endpoint resolves.
 *
 * Resolved per call rather than at module load: `os.homedir()` follows `$HOME`
 * on POSIX, and a hook can be spawned into an environment that sets it.
 *
 * @public
 */
export const userConfigDir = (): string =>
  path.join(os.homedir(), '.openthrottle');

/**
 * Marker identifying an OpenThrottle checkout. The root `package.json` is named
 * `monorepo`, which identifies nothing, so the marker is the server application
 * this repo exists to publish. Structural rather than path-name based: a
 * worktree, a clone under any directory name, and a rename of the checkout all
 * still match, while nothing else does.
 */
const OT_MARKER_REL = path.join(
  'applications',
  'openthrottle-server',
  'package.json',
);
const OT_MARKER_NAME = 'openthrottle-server';

const checkoutCache = new Map<string, boolean>();

/**
 * Is `repoRoot` an OpenThrottle checkout? Fails CLOSED — an unreadable or
 * ambiguous root is treated as foreign, so the worst outcome is telemetry that
 * buffers locally rather than a stranger's `.env` being read.
 *
 * @public
 */
export const isOpenThrottleCheckout = (
  repoRoot: string | undefined,
): boolean => {
  if (!repoRoot) {
    return false;
  }
  const cached = checkoutCache.get(repoRoot);
  if (cached !== undefined) {
    return cached;
  }

  let match = false;
  try {
    const markerPath = path.join(repoRoot, OT_MARKER_REL);
    if (fs.existsSync(markerPath)) {
      const parsed: unknown = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
      match =
        typeof parsed === 'object' &&
        parsed !== null &&
        'name' in parsed &&
        parsed.name === OT_MARKER_NAME;
    }
  } catch {
    match = false;
  }

  checkoutCache.set(repoRoot, match);
  return match;
};

/**
 * Resolve the current git branch for `repoRoot`. Fail-open → '' on any error.
 *
 * @public
 */
export const resolveGitBranch = (repoRoot: string): string => {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000,
    }).trim();
  } catch {
    return '';
  }
};

/**
 * Parse a `.env` file into a plain object (no process.env mutation). Missing or
 * unreadable files yield an empty map.
 *
 * @public
 */
export const readEnvFile = (envPath: string): Record<string, string> => {
  const out: Record<string, string> = {};
  try {
    if (!fs.existsSync(envPath)) {
      return out;
    }
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      if (!key) {
        continue;
      }
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
  } catch (err) {
    logHookError('readEnvFile failed', err);
  }
  return out;
};

/**
 * Parse repo `.env` — but ONLY for an OpenThrottle checkout. A foreign repo's
 * `.env` is never opened, which is the claim both plugin READMEs make.
 *
 * @public
 */
export const readRepoEnvFile = (repoRoot: string): Record<string, string> =>
  isOpenThrottleCheckout(repoRoot)
    ? readEnvFile(path.join(repoRoot, '.env'))
    : {};

/**
 * Parse the user-global `~/.openthrottle/.env`. Same key names as the repo
 * `.env`; only the location differs.
 *
 * @public
 */
export const readUserEnvFile = (): Record<string, string> =>
  readEnvFile(path.join(userConfigDir(), '.env'));

/**
 * Load KEY=VALUE pairs from repo `.env` into process.env without overriding
 * keys already set (fill-in for missing keys only).
 *
 * @public
 */
export const loadRepoEnv = (repoRoot: string): void => {
  try {
    const fileEnv = readRepoEnvFile(repoRoot);
    for (const [key, value] of Object.entries(fileEnv)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (err) {
    logHookError('loadRepoEnv failed', err);
  }
};

/** @public */
export interface EnvResolutionOptions {
  /**
   * Consult the ambient process environment. Default true.
   *
   * Set false when answering "what would an agent started by the USER in this
   * checkout resolve?" from a different process — a server, say. Its own
   * environment is not that agent's environment, and treating it as such
   * reports configuration the agent will never see. The two file layers ARE
   * shared: the checkout is the same checkout, and `~/.openthrottle/.env` is
   * the same home directory.
   */
  readonly includeProcessEnv?: boolean;
}

/**
 * The layers, highest first. One definition, so `resolveOtEnv` and
 * `resolveGraphqlUrl` cannot disagree about order or membership.
 */
const envLayers = (
  repoRoot: string | undefined,
  options: EnvResolutionOptions | undefined,
): Array<Record<string, string | undefined>> => [
  repoRoot ? readRepoEnvFile(repoRoot) : {},
  ...(options?.includeProcessEnv === false ? [] : [process.env]),
  readUserEnvFile(),
];

/**
 * Resolve one OT env value by location: this OT checkout's `.env`, then the
 * ambient shell, then `~/.openthrottle/.env`.
 *
 * @public
 */
export const resolveOtEnv = (
  repoRoot: string | undefined,
  key: string,
  options?: EnvResolutionOptions,
): string => {
  for (const layer of envLayers(repoRoot, options)) {
    const value = layer[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return '';
};

/**
 * Build a graphql URL from an env map (file or process).
 *
 * @public
 */
export const graphqlUrlFromEnvMap = (
  env: Record<string, string | undefined>,
): string | null => {
  const explicit =
    env.OPENTHROTTLE_GRAPHQL_URL?.trim() ||
    env.OPENTHROTTLE_WORKER_GRAPHQL_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const appUrl = env.OPENTHROTTLE_SERVER_APP_URL?.trim()?.replace(/\/$/, '');
  if (appUrl) {
    return `${appUrl}/graphql`;
  }
  return null;
};

/**
 * Resolve the GraphQL endpoint by location. Each layer is asked for a COMPLETE
 * answer before the next is consulted, so a layer that sets only
 * `OPENTHROTTLE_SERVER_APP_URL` is not silently married to a lower layer's
 * `OPENTHROTTLE_GRAPHQL_URL`.
 *
 * @public
 */
export const resolveGraphqlUrl = (
  repoRoot?: string,
  options?: EnvResolutionOptions,
): string | null => {
  for (const layer of envLayers(repoRoot, options)) {
    const url = graphqlUrlFromEnvMap(layer);
    if (url) {
      return url;
    }
  }
  return null;
};

/**
 * Auth token for ingest (service account or worker token).
 *
 * @public
 */
export const resolveAuthToken = (
  repoRoot?: string,
  options?: EnvResolutionOptions,
): string =>
  resolveOtEnv(repoRoot, 'OPENTHROTTLE_MCP_AUTH_TOKEN', options) ||
  resolveOtEnv(repoRoot, 'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN', options) ||
  '';
