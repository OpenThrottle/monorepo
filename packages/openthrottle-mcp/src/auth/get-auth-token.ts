/**
 * @description Resolves the auth token for GraphQL requests (executeGraphqlWithAuth).
 * Source: per-request store (see {@link withMcpDeveloperAuthToken}), then env OPENTHROTTLE_MCP_AUTH_TOKEN.
 */

import { readFileSync } from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';

export const requestAuthTokenStorage = new AsyncLocalStorage<string>();

const TOKEN_ENV_VAR = 'OPENTHROTTLE_MCP_AUTH_TOKEN';

/**
 * @description Env var the stdio launcher (`scripts/run-openthrottle-mcp.sh`) sets
 * to the absolute path of the `.env` file it self-loaded the token from. Its presence
 * is what enables mid-session re-resolution; it is unset when the token came from an
 * exported shell var (that shell is then the source of truth) or in the embedded
 * server (per-request tokens). See {@link refreshEnvAuthTokenFromFile}.
 */
const TOKEN_ENV_FILE_VAR = 'OT_MCP_AUTH_TOKEN_ENV_FILE';

/**
 * @description Minimum interval between `.env` re-reads, in ms. Override with
 * `OT_MCP_TOKEN_REFRESH_MS`; `0` (or negative) disables re-resolution entirely.
 */
const DEFAULT_REFRESH_MS = 5000;

let lastRefreshAt = 0;
let lastRefreshFile: string | undefined;

/** @description Reset the re-resolution throttle. Test-only. */
export function resetEnvAuthTokenRefreshForTests(): void {
  lastRefreshAt = 0;
  lastRefreshFile = undefined;
}

function parseRefreshMs(): number {
  const raw = process.env.OT_MCP_TOKEN_REFRESH_MS;
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_REFRESH_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : DEFAULT_REFRESH_MS;
}

/**
 * @description Reads the last non-empty `OPENTHROTTLE_MCP_AUTH_TOKEN=` line from an
 * env file, stripping surrounding quotes. Mirrors the launcher's `read_env_var`.
 * Returns undefined on any read error or when the value is absent/empty — never throws.
 */
function readTokenFromEnvFile(file: string): string | undefined {
  let contents: string;
  try {
    contents = readFileSync(file, 'utf8');
  } catch {
    return undefined;
  }
  let value: string | undefined;
  for (const line of contents.split(/\r?\n/)) {
    const match = /^OPENTHROTTLE_MCP_AUTH_TOKEN=(.*)$/.exec(line);
    if (match) {
      value = match[1];
    }
  }
  if (value === undefined) {
    return undefined;
  }
  const unquoted = value
    .trim()
    .replace(/^["']/, '')
    .replace(/["']$/, '')
    .trim();
  return unquoted === '' ? undefined : unquoted;
}

/**
 * @description Mid-session self-heal for the long-lived stdio MCP process: re-reads
 * the auth token from the `.env` file the launcher recorded in `OT_MCP_AUTH_TOKEN_ENV_FILE`
 * and updates `process.env.OPENTHROTTLE_MCP_AUTH_TOKEN` when it changed, so a token
 * rotated in `.env` is picked up WITHOUT relaunching (the launcher's preflight only
 * runs once, at boot). Throttled to at most one read per `OT_MCP_TOKEN_REFRESH_MS`
 * (default 5000ms; `0` disables). No-op when the launcher recorded no file (exported
 * shell var, or the embedded per-request-token server). Never throws — token resolution
 * must not break on a missing/rotated file; a revoked token that `.env` does NOT update
 * is out of scope here (see the `auth_status` tool + reconnect runbook).
 * @public
 */
export function refreshEnvAuthTokenFromFile(now: number = Date.now()): void {
  const file = process.env[TOKEN_ENV_FILE_VAR];
  if (file === undefined || file === '') {
    return;
  }
  const refreshMs = parseRefreshMs();
  if (refreshMs <= 0) {
    return;
  }
  // Re-read immediately when the source file changed; otherwise honor the throttle.
  if (file === lastRefreshFile && now - lastRefreshAt < refreshMs) {
    return;
  }
  lastRefreshAt = now;
  lastRefreshFile = file;
  const fromFile = readTokenFromEnvFile(file);
  if (fromFile !== undefined && fromFile !== process.env[TOKEN_ENV_VAR]) {
    process.env[TOKEN_ENV_VAR] = fromFile;
  }
}

/**
 * @description Runs fn with a request-scoped JWT for MCP tool handlers that call {@link getAuthToken}. Use when embedding tools in openthrottle-server so concurrent GraphQL requests do not share a global override. When token is empty, falls through to env.
 * @public
 */
export function withMcpDeveloperAuthToken<T>(
  token: string | undefined,
  fn: () => T,
): T {
  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (trimmed === '') {
    return fn();
  }

  return requestAuthTokenStorage.run(trimmed, fn);
}

/**
 * @description Async variant of {@link withMcpDeveloperAuthToken}.
 * @public
 */
export async function withMcpDeveloperAuthTokenAsync<T>(
  token: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (trimmed === '') {
    return fn();
  }

  return requestAuthTokenStorage.run(trimmed, fn);
}

/**
 * @description Reads auth token from per-request store (if any), then env OPENTHROTTLE_MCP_AUTH_TOKEN. Throws if missing so callers do not send an empty Bearer header.
 * @returns The token to pass to executeGraphqlWithAuth.
 * @throws Error when no token is configured (message instructs setting env var).
 * @public
 */
export function getAuthToken(): string {
  const fromRequest = requestAuthTokenStorage.getStore();
  if (fromRequest !== undefined && fromRequest !== '') {
    return fromRequest;
  }

  // Pick up a token rotated in .env mid-session without relaunching (no-op unless
  // the stdio launcher recorded a source file). See refreshEnvAuthTokenFromFile.
  refreshEnvAuthTokenFromFile();

  const token = process.env.OPENTHROTTLE_MCP_AUTH_TOKEN;
  const trimmed = typeof token === 'string' ? token.trim() : '';

  if (trimmed === '') {
    throw new Error(
      'Auth token required for OpenThrottle (OT) GraphQL. Set OPENTHROTTLE_MCP_AUTH_TOKEN in the environment (e.g. in your MCP server config).',
    );
  }

  return trimmed;
}
