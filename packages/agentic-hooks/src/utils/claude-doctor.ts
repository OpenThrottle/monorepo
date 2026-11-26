/**
 * The telemetry doctor's runtime half, in three sections. The pure checks live in
 * `./claude-doctor-checks.ts`; the `--fix` flow lives in `./claude-doctor-fix.ts`.
 *
 * - Output: {@link scrubText}, {@link renderDoctorJson} and {@link renderDoctorHuman}. Everything
 *   printed passes through `scrubCheck`, so a path under the home directory renders as `~/…` and
 *   no token, email or hostname can leak into output a user may paste into an issue.
 * - Fact gathering: {@link collectChecks}, with {@link probeHealth} and
 *   {@link resolvePayloadVersion}, reads the registry, endpoint, buffers and heartbeat receipt.
 * - Arguments: {@link parseDoctorArgs} parses `--fix`, `--json` and `--strict`.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { toErrorMessage } from '@openthrottle/nodejs-utils';

import {
  graphqlUrlFromEnvMap,
  readRepoEnvFile,
  readUserEnvFile,
  resolveAuthToken,
  resolveGraphqlUrl,
} from '../config/env.ts';
import {
  LAST_HEARTBEAT_BASENAME,
  readVersionField,
} from '../data/heartbeat.ts';
import { resolveTelemetryDir } from '../data/jsonl.ts';
import { readBufferStats } from '../data/readBufferStats.ts';
import type {
  DoctorCheck,
  EnvLayer,
  HealthProbe,
} from './claude-doctor-checks.ts';
import {
  checkBuffer,
  checkEndpoint,
  checkHeartbeat,
  checkOffline,
  checkPlugin,
  checkPrivacyOptIns,
  checkReachability,
  checkToken,
  parseHeartbeatReceipt,
  summarizeChecks,
} from './claude-doctor-checks.ts';
import {
  parseMarketplaceInstall,
  resolveClaudeConfigDir,
} from './claude-heartbeat.ts';
import { readTruncatedRepoOptIns } from './privacy.ts';

// ── Output ──
// Everything printed passes through `scrubCheck`, so a path under the home directory renders as
// `~/…` and no token, email or hostname can leak into output a user may paste into an issue.

/** Shortest token worth scrubbing; anything shorter would mangle ordinary words. */
const MIN_SCRUBBED_TOKEN_LENGTH = 6;

/** Shortest hostname worth scrubbing, for the same reason. */
const MIN_SCRUBBED_HOSTNAME_LENGTH = 4;

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

const ID_COLUMN_WIDTH = 14;
const STATUS_COLUMN_WIDTH = 4;

/**
 * What must never appear in output.
 *
 * @public
 */
export interface Scrubber {
  readonly homeDirs: readonly string[];
  readonly hostname: string | null;
  readonly token: string | null;
}

/**
 * Remove secrets and identity from one string.
 *
 * @public
 */
export const scrubText = (text: string, scrubber: Scrubber): string => {
  let out = text;
  if (
    scrubber.token !== null &&
    scrubber.token.length >= MIN_SCRUBBED_TOKEN_LENGTH
  ) {
    out = out.split(scrubber.token).join('<token>');
  }
  const homes = [...scrubber.homeDirs]
    .filter((home) => home.length > 1)
    .sort((a, b) => b.length - a.length);
  for (const home of homes) {
    out = out.split(home).join('~');
  }
  out = out.replace(EMAIL_PATTERN, '<email>');
  const host = scrubber.hostname;
  if (
    host !== null &&
    host.length >= MIN_SCRUBBED_HOSTNAME_LENGTH &&
    host !== 'localhost'
  ) {
    out = out.split(host).join('<host>');
  }
  return out;
};

const scrubCheck = (check: DoctorCheck, scrubber: Scrubber): DoctorCheck => {
  return {
    detail: scrubText(check.detail, scrubber),
    fix: check.fix === null ? null : scrubText(check.fix, scrubber),
    id: check.id,
    status: check.status,
  };
};

/**
 * The `--json` document: `{ checks, summary }`, scrubbed.
 *
 * @public
 */
export const renderDoctorJson = (
  checks: readonly DoctorCheck[],
  scrubber: Scrubber,
): string => {
  const clean = checks.map((check) => scrubCheck(check, scrubber));
  return `${JSON.stringify({ checks: clean, summary: summarizeChecks(clean) }, null, 2)}\n`;
};

/**
 * The default aligned-lines output followed by a "Fixes" block, scrubbed.
 *
 * @public
 */
export const renderDoctorHuman = (
  checks: readonly DoctorCheck[],
  scrubber: Scrubber,
): string => {
  const clean = checks.map((check) => scrubCheck(check, scrubber));
  const lines = clean.map((check) => {
    const status = check.status.padEnd(STATUS_COLUMN_WIDTH);
    return `${status}  ${check.id.padEnd(ID_COLUMN_WIDTH)}${check.detail}`;
  });
  const withFix = clean.filter((check) => check.fix !== null);
  const fixes = withFix.flatMap((check): readonly string[] => {
    const body = (check.fix ?? '').split('\n').map((line) => `    ${line}`);
    return [`  ${check.id}`, ...body];
  });
  const summary = summarizeChecks(clean);
  const tally = `${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`;
  const tail = fixes.length === 0 ? [] : ['', 'Fixes', ...fixes];
  return `${[...lines, '', tally, ...tail].join('\n')}\n`;
};

// ── Fact gathering ──
// Impure half of the telemetry doctor: read the plugin registry, resolve the endpoint through the
// hooks' own resolver (and report which layer answered), probe `GET <origin>/health`, read the
// buffers and the heartbeat receipt, then hand every fact to the pure checks in
// `./claude-doctor-checks.ts`.
//
// Never writes anything and never sends the token anywhere: `/health` is a public route.

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
      reason: toErrorMessage(err),
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
 * The version of the payload this bundle ships in: `<bundle dir>/../.claude-plugin/plugin.json`,
 * which holds for the plugin's `dist/` (where the `bin/` stub points `argv[1]`). The second
 * candidate is the repo's own `plugins/openthrottle` payload, for a bundle run from a tool hook
 * folder such as `.claude/hooks/`. Null when neither is readable, which skips the comparison.
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
    checkPrivacyOptIns(readTruncatedRepoOptIns()),
  ];
};

// ── Arguments ──

/**
 * Flags for the telemetry doctor CLI.
 *
 * @public
 */
export interface DoctorArgs {
  readonly fix: boolean;
  readonly json: boolean;
  readonly strict: boolean;
}

/**
 * Parse `--fix`, `--json` and `--strict`; unknown arguments are ignored.
 *
 * @public
 */
export const parseDoctorArgs = (argv: readonly string[]): DoctorArgs => {
  return {
    fix: argv.includes('--fix'),
    json: argv.includes('--json'),
    strict: argv.includes('--strict'),
  };
};
