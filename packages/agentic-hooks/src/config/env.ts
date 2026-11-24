/**
 * Env + git resolution, keyed on WHERE a value lives rather than on what it is
 * called. One vocabulary — `OPENTHROTTLE_*` — at every layer:
 *
 * 1. `<repoRoot>/.env`, and only when repoRoot is an OpenThrottle checkout.
 *    A worktree's own `.env` beats the ambient shell on purpose: an OT worktree
 *    runs its own server on its own port, and a stale parent shell would
 *    otherwise divert this worktree's capture to a sibling's (or a
 *    pre-migration) schema.
 * 2. `process.env` — the ambient shell. A key present here with a blank value
 *    is an explicit "no value" and ends the lookup for its concern (endpoint
 *    or token): OT Loop blanks its worker's tokens, and the user-global file
 *    must not hand them back.
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
import { normalizeRemoteUrl } from '../utils/normalizeRemoteUrl.ts';

/**
 * The user-global config directory. Also the home of the buffered telemetry
 * written when no endpoint resolves.
 *
 * Resolved per call rather than at module load: `os.homedir()` follows `$HOME`
 * on POSIX, and a hook can be spawned into an environment that sets it.
 *
 * @public
 */
export const userConfigDir = (): string => {
  return path.join(os.homedir(), '.openthrottle');
};

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

const repoIdentityCache = new Map<string, string | null>();

/**
 * The checkout's `remote.origin.url`, normalized client-side with
 * `normalizeRemoteUrl` so a credential in the remote never leaves the machine.
 * Null when there is no remote or it does not normalize — never the path
 * (docs/monorepo/child-repo-hook-telemetry-contract.md §3). Cached per root,
 * since every event in a hook invocation asks for the same one. Fail-open.
 *
 * @public
 */
export const resolveRepoIdentity = (repoRoot: string): string | null => {
  const cached = repoIdentityCache.get(repoRoot);
  if (cached !== undefined) {
    return cached;
  }

  let identity: string | null = null;
  try {
    const remote = execFileSync(
      'git',
      ['config', '--get', 'remote.origin.url'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 1000,
      },
    );
    identity = normalizeRemoteUrl(remote);
  } catch {
    identity = null;
  }

  repoIdentityCache.set(repoRoot, identity);
  return identity;
};

/**
 * The working directory a record may carry for `repoRoot`: the observed one in
 * an OpenThrottle checkout, null in a foreign repo, whose absolute path would
 * leak the user's home-directory layout (contract §3). Fails closed with
 * `isOpenThrottleCheckout`.
 *
 * @public
 */
export const resolveReportableCwd = (
  repoRoot: string,
  cwd: string | null | undefined,
): string | null => {
  if (!isOpenThrottleCheckout(repoRoot)) {
    return null;
  }
  return cwd || null;
};

/** One `KEY=value` assignment parsed out of a `.env` line. @public */
export interface EnvLineAssignment {
  readonly key: string;
  readonly value: string;
}

/**
 * Parse one `.env` line. Null for a blank line, a comment, or anything that is
 * not `KEY=value`. Surrounding single or double quotes are stripped; an inline
 * `# …` after the value is NOT a comment — it stays part of the value.
 *
 * The one parser both the reader ({@link readEnvFile}) and the user-env writer
 * use, so the two cannot disagree about which line sets which key.
 *
 * @public
 */
export const parseEnvLine = (line: string): EnvLineAssignment | null => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    return null;
  }
  const eq = trimmed.indexOf('=');
  if (eq <= 0) {
    return null;
  }
  const key = trimmed.slice(0, eq).trim();
  if (!key) {
    return null;
  }
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
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
      const assignment = parseEnvLine(line);
      if (assignment) {
        out[assignment.key] = assignment.value;
      }
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
export const readRepoEnvFile = (repoRoot: string): Record<string, string> => {
  return isOpenThrottleCheckout(repoRoot)
    ? readEnvFile(path.join(repoRoot, '.env'))
    : {};
};

/**
 * Parse the user-global `~/.openthrottle/.env`. Same key names as the repo
 * `.env`; only the location differs.
 *
 * @public
 */
export const readUserEnvFile = (): Record<string, string> => {
  return readEnvFile(path.join(userConfigDir(), '.env'));
};

/**
 * Load KEY=VALUE pairs from repo `.env` into process.env without overriding
 * keys already set (fill-in for missing keys only). Blank values are skipped.
 *
 * @public
 */
export const loadRepoEnv = (repoRoot: string): void => {
  try {
    const fileEnv = readRepoEnvFile(repoRoot);
    for (const [key, value] of Object.entries(fileEnv)) {
      // A blank file value is not copied: in `process.env` a present-but-empty
      // key is an explicit blank (see {@link envLayers}) and would shut off
      // the user-global layer.
      if (process.env[key] === undefined && value.trim() !== '') {
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

/** Keys that set the GraphQL endpoint, in the order a layer is read. */
const GRAPHQL_ENDPOINT_ENV_KEYS = [
  'OPENTHROTTLE_GRAPHQL_URL',
  'OPENTHROTTLE_WORKER_GRAPHQL_URL',
  'OPENTHROTTLE_SERVER_APP_URL',
] as const;

/** Keys that set the ingest auth token, in the order a layer is read. */
const AUTH_TOKEN_ENV_KEYS = [
  'OPENTHROTTLE_MCP_AUTH_TOKEN',
  'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
] as const;

interface EnvLayer {
  /**
   * True only for `process.env`: a key present there with a blank value is an
   * explicit "no value", and ends the lookup for its concern. OT Loop blanks
   * its worker's OT tokens this way (`OT_LOOP_WORKER_BLANKED_ENV_KEYS`), and a
   * blank that fell through to `~/.openthrottle/.env` would hand the worker
   * the machine token anyway. A blank line in a FILE layer is just an unfilled
   * template line (`.env.default` ships them) and never ends a lookup.
   */
  readonly blankIsTerminal: boolean;
  readonly values: Record<string, string | undefined>;
}

/**
 * The layers, highest first. One definition, so `resolveOtEnv`,
 * `resolveGraphqlUrl` and `resolveAuthToken` cannot disagree about order or
 * membership.
 */
const envLayers = (
  repoRoot: string | undefined,
  options: EnvResolutionOptions | undefined,
): EnvLayer[] => {
  const excludeProcessEnv = options?.includeProcessEnv === false;
  const processLayer: EnvLayer[] = excludeProcessEnv
    ? []
    : [{ blankIsTerminal: true, values: process.env }];
  return [
    {
      blankIsTerminal: false,
      values: repoRoot ? readRepoEnvFile(repoRoot) : {},
    },
    ...processLayer,
    { blankIsTerminal: false, values: readUserEnvFile() },
  ];
};

/** True when `layer` ends the lookup for a concern made of `keys`. */
const isExplicitlyBlank = (
  layer: EnvLayer,
  keys: readonly string[],
): boolean => {
  return (
    layer.blankIsTerminal &&
    keys.some((key) => {
      const value = layer.values[key];
      return value !== undefined && value.trim() === '';
    })
  );
};

/**
 * Walk the layers for one concern: the first layer whose `pick` answers wins,
 * and an explicit blank in `process.env` for any of `keys` answers "nothing".
 */
const resolveConcern = <TValue>(
  repoRoot: string | undefined,
  options: EnvResolutionOptions | undefined,
  keys: readonly string[],
  pick: (values: Record<string, string | undefined>) => TValue | null,
): TValue | null => {
  for (const layer of envLayers(repoRoot, options)) {
    const answer = pick(layer.values);
    if (answer !== null) {
      return answer;
    }
    if (isExplicitlyBlank(layer, keys)) {
      return null;
    }
  }
  return null;
};

const pickTrimmed = (
  values: Record<string, string | undefined>,
  key: string,
): string | null => {
  const value = values[key]?.trim();
  return value ? value : null;
};

/**
 * Resolve one OT env value by location: this OT checkout's `.env`, then the
 * ambient shell, then `~/.openthrottle/.env`. A key set to `''` in the ambient
 * shell resolves to `''` without consulting the user-global file.
 *
 * @public
 */
export const resolveOtEnv = (
  repoRoot: string | undefined,
  key: string,
  options?: EnvResolutionOptions,
): string => {
  return (
    resolveConcern(repoRoot, options, [key], (values) => {
      return pickTrimmed(values, key);
    }) ?? ''
  );
};

/**
 * Matches a host of exactly `localhost` in the authority position: the scheme,
 * optional userinfo, then the host, which must end at a port, path, query,
 * fragment or the end of the string.
 *
 * The lookahead is what keeps `localhost.example.com` and `mylocalhost` out,
 * and the userinfo group is what keeps `http://localhost@example.com` from
 * being read as a loopback host.
 */
const LOOPBACK_AUTHORITY =
  /^([a-z][a-z0-9+.-]*:\/\/(?:[^/?#@]*@)?)localhost(?=[:/?#]|$)/i;

/**
 * Rewrite a `localhost` host to `127.0.0.1`, leaving scheme, userinfo, port,
 * path, query and fragment untouched.
 *
 * Node's `fetch` (undici) and `curl` order address families differently for
 * `localhost`. When it resolves to `::1` first and the server binds only
 * `0.0.0.0`, undici's connect fails where curl transparently falls back to
 * IPv4 — and because telemetry is fail-open, that failure is invisible: events
 * divert to the JSONL buffer while every surface still looks healthy. Pinning
 * the literal IPv4 loopback at resolution time fixes every adapter at once and
 * adds no runtime dependency, which the committed bundles require.
 *
 * A string that is not URL-shaped simply does not match and is returned as-is;
 * this sits on a fail-open path and must never throw.
 *
 * @public
 */
export const normalizeLoopbackHost = (url: string): string => {
  return url.replace(LOOPBACK_AUTHORITY, '$1127.0.0.1');
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
    return normalizeLoopbackHost(explicit.replace(/\/$/, ''));
  }
  const appUrl = env.OPENTHROTTLE_SERVER_APP_URL?.trim()?.replace(/\/$/, '');
  if (appUrl) {
    return normalizeLoopbackHost(`${appUrl}/graphql`);
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
  return resolveConcern(
    repoRoot,
    options,
    GRAPHQL_ENDPOINT_ENV_KEYS,
    graphqlUrlFromEnvMap,
  );
};

/**
 * Auth token for ingest (service account or worker token), resolved as one
 * concern: each layer is asked for either key before the next layer is read,
 * and a blank for either key in the ambient shell resolves to `''`.
 *
 * @public
 */
export const resolveAuthToken = (
  repoRoot?: string,
  options?: EnvResolutionOptions,
): string => {
  return (
    resolveConcern(repoRoot, options, AUTH_TOKEN_ENV_KEYS, (values) => {
      for (const key of AUTH_TOKEN_ENV_KEYS) {
        const value = pickTrimmed(values, key);
        if (value !== null) {
          return value;
        }
      }
      return null;
    }) ?? ''
  );
};
