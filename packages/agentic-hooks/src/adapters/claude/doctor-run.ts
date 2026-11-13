/**
 * Impure half of the telemetry doctor: read the plugin registry, resolve the endpoint through the
 * hooks' own resolver (and report which layer answered), probe `GET <origin>/health`, read the
 * buffers and the heartbeat receipt, then hand every fact to the pure checks in `doctor-checks.ts`.
 *
 * Never writes anything and never sends the token anywhere: `/health` is a public route.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  graphqlUrlFromEnvMap,
  readRepoEnvFile,
  readUserEnvFile,
  resolveAuthToken,
  resolveGraphqlUrl,
} from '../../config/env.ts';
import { resolveTelemetryDir } from '../../data/jsonl.ts';
import { readBufferStats } from '../../data/readBufferStats.ts';
import {
  checkBuffer,
  checkEndpoint,
  checkHeartbeat,
  checkOffline,
  checkPlugin,
  checkReachability,
  checkToken,
  type DoctorCheck,
  type EnvLayer,
  type HealthProbe,
  parseHeartbeatReceipt,
} from './doctor-checks.ts';
import {
  parseMarketplaceInstall,
  readVersionField,
  resolveClaudeConfigDir,
} from './heartbeat-payload.ts';
import { LAST_HEARTBEAT_BASENAME } from './heartbeat-run.ts';

/** How long `/health` gets before the server counts as unreachable. */
const HEALTH_TIMEOUT_MS = 2000;

const TOKEN_KEYS = [
  'OPENTHROTTLE_MCP_AUTH_TOKEN',
  'OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN',
] as const;

/**
 * The slice of `fetch` the probe needs; `globalThis.fetch` satisfies it.
 *
 * @public
 */
export type DoctorFetch = (
  url: string,
  init: { method: string; signal: AbortSignal },
) => Promise<{ ok: boolean; status: number }>;

const readTextOrNull = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

/** The first layer, highest first, whose env map yields a GraphQL URL. */
const resolveUrlLayer = (repoRoot: string): EnvLayer | null => {
  if (graphqlUrlFromEnvMap(readRepoEnvFile(repoRoot)) !== null) {
    return 'repo-env';
  }
  if (graphqlUrlFromEnvMap(process.env) !== null) {
    return 'process-env';
  }
  return graphqlUrlFromEnvMap(readUserEnvFile()) === null ? null : 'user-env';
};

const hasTokenKey = (env: Record<string, string | undefined>): boolean => {
  return TOKEN_KEYS.some((key) => (env[key] ?? '').trim() !== '');
};

/** The first layer, highest first, that carries a token key. */
const resolveTokenLayer = (repoRoot: string): EnvLayer | null => {
  if (hasTokenKey(readRepoEnvFile(repoRoot))) {
    return 'repo-env';
  }
  if (hasTokenKey(process.env)) {
    return 'process-env';
  }
  return hasTokenKey(readUserEnvFile()) ? 'user-env' : null;
};

const isTimeoutError = (err: unknown): boolean => {
  return (
    err instanceof Error &&
    (err.name === 'TimeoutError' || err.name === 'AbortError')
  );
};

/**
 * `GET <origin>/health` with a short timeout. The server's health controller is a public GET
 * route at the origin root, so no fallback GraphQL probe is needed and no credential is sent.
 *
 * @public
 */
export const probeHealth = async ({
  fetchImpl,
  now,
  origin,
  timeoutMs = HEALTH_TIMEOUT_MS,
}: {
  readonly fetchImpl: DoctorFetch;
  readonly now: () => number;
  readonly origin: string;
  readonly timeoutMs?: number;
}): Promise<HealthProbe> => {
  const startedAt = now();
  try {
    const response = await fetchImpl(`${origin}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.ok) {
      return { kind: 'ok', ms: now() - startedAt, status: response.status };
    }
    return { kind: 'http', status: response.status };
  } catch (err) {
    if (isTimeoutError(err)) {
      return { kind: 'timeout' };
    }
    return {
      kind: 'error',
      reason: err instanceof Error ? err.message : String(err),
    };
  }
};

/**
 * The origin of a GraphQL URL with any userinfo, path and query dropped; null when unparsable.
 *
 * @public
 */
export const originOf = (graphqlUrl: string): string | null => {
  try {
    return new URL(graphqlUrl).origin;
  } catch {
    return null;
  }
};

/** A GraphQL URL as shown to the user: no userinfo, no query, no fragment. */
const displayUrl = (graphqlUrl: string): string => {
  try {
    const url = new URL(graphqlUrl);
    return `${url.origin}${url.pathname === '/' ? '' : url.pathname}`;
  } catch {
    return graphqlUrl;
  }
};

/**
 * The version of the payload this bundle ships in: `<bundle dir>/../.claude-plugin/plugin.json`
 * when run from a plugin, else the repo's own `plugins/openthrottle` payload when run from
 * `.claude/hooks/`. Null when neither is readable, which skips the comparison.
 *
 * @public
 */
export const resolvePayloadVersion = (scriptPath: string): string | null => {
  const scriptDir = path.dirname(scriptPath);
  const candidates = [
    path.join(scriptDir, '..', '.claude-plugin', 'plugin.json'),
    path.join(
      scriptDir,
      '..',
      '..',
      'plugins',
      'openthrottle',
      '.claude-plugin',
      'plugin.json',
    ),
  ];
  for (const candidate of candidates) {
    const raw = readTextOrNull(candidate);
    const version = raw === null ? null : readVersionField(raw);
    if (version !== null) {
      return version;
    }
  }
  return null;
};

/** `<doctor dir>/skill-usage-drain.cjs`, quoted when the path has whitespace. */
const drainCommandFor = (scriptPath: string): string => {
  const drain = path.join(path.dirname(scriptPath), 'skill-usage-drain.cjs');
  return /\s/.test(drain) ? `"${drain}"` : drain;
};

const resolveProbe = async ({
  fetchImpl,
  now,
  origin,
}: {
  readonly fetchImpl: DoctorFetch;
  readonly now: () => number;
  readonly origin: string | null;
}): Promise<HealthProbe> => {
  if (origin === null) {
    return { kind: 'skipped' };
  }
  return probeHealth({ fetchImpl, now, origin });
};

/**
 * Gather every fact and run every check, in report order. Never throws on missing files.
 *
 * @public
 */
export const collectChecks = async ({
  fetchImpl = globalThis.fetch,
  now = Date.now,
  repoRoot,
  scriptPath,
}: {
  readonly fetchImpl?: DoctorFetch;
  readonly now?: () => number;
  readonly repoRoot: string;
  readonly scriptPath: string;
}): Promise<readonly DoctorCheck[]> => {
  const homeDir = os.homedir();
  const registryRaw = readTextOrNull(
    path.join(
      resolveClaudeConfigDir(process.env, homeDir),
      'plugins',
      'installed_plugins.json',
    ),
  );
  const graphqlUrl = resolveGraphqlUrl(repoRoot);
  const origin = graphqlUrl === null ? null : originOf(graphqlUrl);
  const probe = await resolveProbe({ fetchImpl, now, origin });
  const receiptRaw = readTextOrNull(
    path.join(resolveTelemetryDir(), LAST_HEARTBEAT_BASENAME),
  );

  return [
    checkPlugin({
      install: parseMarketplaceInstall(registryRaw),
      payloadVersion: resolvePayloadVersion(scriptPath),
    }),
    checkEndpoint({
      layer: resolveUrlLayer(repoRoot),
      url: graphqlUrl === null ? null : displayUrl(graphqlUrl),
    }),
    checkToken({
      layer: resolveTokenLayer(repoRoot),
      present: resolveAuthToken(repoRoot) !== '',
    }),
    checkReachability({ origin, probe }),
    checkBuffer({
      drainCommand: drainCommandFor(scriptPath),
      nowMs: now(),
      serverHealthy: probe.kind === 'ok',
      stats: readBufferStats(),
    }),
    checkHeartbeat({
      nowMs: now(),
      receipt: parseHeartbeatReceipt(receiptRaw),
    }),
    checkOffline({
      offline: process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1',
    }),
  ];
};
