/**
 * Pure half of the telemetry doctor: each check takes already-gathered facts and returns a
 * structured result (status, one-line detail, optional fix). No filesystem, network or clock, so
 * every row is testable. `doctor-run.ts` gathers the facts; `doctor-render.ts` prints the results.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import type { BufferStats } from '../../data/readBufferStats.ts';
import type { MarketplaceInstall } from './heartbeat-payload.ts';

/** The marketplace plugin id, as typed into `/plugin install`. */
const PLUGIN_ID = 'openthrottle@openthrottle';

/** A buffer whose oldest record is older than this is not draining. */
const STALE_BUFFER_MS = 24 * 60 * 60 * 1000;

/**
 * Outcome of one check.
 *
 * @public
 */
export const CHECK_STATUS = {
  FAIL: 'FAIL',
  PASS: 'PASS',
  WARN: 'WARN',
} as const;

/** @public */
export type CheckStatus = (typeof CHECK_STATUS)[keyof typeof CHECK_STATUS];

/**
 * Which check a result belongs to.
 *
 * @public
 */
export type CheckId =
  | 'buffer'
  | 'endpoint'
  | 'heartbeat'
  | 'offline'
  | 'plugin'
  | 'reachability'
  | 'token';

/**
 * One doctor result. `fix` is a ready-to-run remedy (possibly several lines), or null when there
 * is nothing to run.
 *
 * @public
 */
export interface DoctorCheck {
  readonly detail: string;
  readonly fix: string | null;
  readonly id: CheckId;
  readonly status: CheckStatus;
}

/**
 * Which env layer supplied a value, matching the hooks' own resolution order.
 *
 * @public
 */
export type EnvLayer = 'process-env' | 'repo-env' | 'user-env';

/**
 * What `GET <origin>/health` did.
 *
 * @public
 */
export type HealthProbe =
  | { readonly kind: 'error'; readonly reason: string }
  | { readonly kind: 'http'; readonly status: number }
  | { readonly kind: 'ok'; readonly ms: number; readonly status: number }
  | { readonly kind: 'skipped' }
  | { readonly kind: 'timeout' };

/**
 * The parts of `last-heartbeat.json` the doctor reads.
 *
 * @public
 */
export interface ParsedReceipt {
  readonly attemptedAt: string;
  readonly delivered: boolean;
  readonly error: string | null;
}

/**
 * Per-check results folded into counts.
 *
 * @public
 */
export interface DoctorSummary {
  readonly fail: number;
  readonly pass: number;
  readonly warn: number;
}

const ENV_LAYER_LABELS: Readonly<Record<EnvLayer, string>> = {
  'process-env': 'process env',
  'repo-env': 'repo .env',
  'user-env': '~/.openthrottle/.env',
};

/**
 * Compact age: minutes under an hour, hours under two days, else days.
 *
 * @public
 */
export const formatAge = (ageMs: number): string => {
  const minutes = Math.max(0, Math.floor(ageMs / 60_000));
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
};

const parseVersion = (version: string): readonly number[] | null => {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (match === null) {
    return null;
  }
  return match.slice(1, 4).map(Number);
};

/**
 * True only when both versions parse and `installed` is strictly older than `payload`.
 *
 * @public
 */
export const isOlderVersion = (installed: string, payload: string): boolean => {
  const left = parseVersion(installed);
  const right = parseVersion(payload);
  if (left === null || right === null) {
    return false;
  }
  for (let i = 0; i < 3; i += 1) {
    const a = left[i] ?? 0;
    const b = right[i] ?? 0;
    if (a !== b) {
      return a < b;
    }
  }
  return false;
};

/**
 * Parse `last-heartbeat.json`. Null for missing, unparsable or foreign-shaped text.
 *
 * @public
 */
export const parseHeartbeatReceipt = (
  raw: string | null,
): ParsedReceipt | null => {
  if (raw === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      typeof parsed.attemptedAt !== 'string' ||
      typeof parsed.delivered !== 'boolean'
    ) {
      return null;
    }
    const error = typeof parsed.error === 'string' ? parsed.error : null;
    return {
      attemptedAt: parsed.attemptedAt,
      delivered: parsed.delivered,
      error,
    };
  } catch {
    return null;
  }
};

/**
 * Check 1: is the marketplace plugin installed, and is it current?
 *
 * @public
 */
export const checkPlugin = ({
  install,
  payloadVersion,
}: {
  readonly install: MarketplaceInstall;
  readonly payloadVersion: string | null;
}): DoctorCheck => {
  if (install.installed !== true) {
    return {
      detail: `${PLUGIN_ID} is not installed`,
      fix: [
        'claude plugin marketplace add OpenThrottle/monorepo',
        'claude plugin install openthrottle@openthrottle',
        '(run in a shell, then restart Claude Code; inside a session, /plugin does the same)',
      ].join('\n'),
      id: 'plugin',
      status: CHECK_STATUS.WARN,
    };
  }
  if (install.version === null) {
    return {
      detail: `${PLUGIN_ID} installed (version unknown)`,
      fix: null,
      id: 'plugin',
      status: CHECK_STATUS.PASS,
    };
  }
  if (
    payloadVersion !== null &&
    isOlderVersion(install.version, payloadVersion)
  ) {
    return {
      detail: `${PLUGIN_ID} ${install.version} installed, ${payloadVersion} is current`,
      fix: [
        `claude plugin update ${PLUGIN_ID}`,
        '(run in a shell, then restart Claude Code)',
      ].join('\n'),
      id: 'plugin',
      status: CHECK_STATUS.WARN,
    };
  }
  return {
    detail: `${PLUGIN_ID} ${install.version} installed`,
    fix: null,
    id: 'plugin',
    status: CHECK_STATUS.PASS,
  };
};

/**
 * Check 2a: does the hooks' own resolver find a GraphQL endpoint?
 *
 * @public
 */
export const checkEndpoint = ({
  layer,
  url,
}: {
  readonly layer: EnvLayer | null;
  readonly url: string | null;
}): DoctorCheck => {
  if (url === null) {
    return {
      detail: 'no GraphQL endpoint resolves',
      fix: [
        'Add this line to ~/.openthrottle/.env:',
        'OPENTHROTTLE_GRAPHQL_URL=https://your-openthrottle-server/graphql',
      ].join('\n'),
      id: 'endpoint',
      status: CHECK_STATUS.FAIL,
    };
  }
  const source = layer === null ? 'unknown layer' : ENV_LAYER_LABELS[layer];
  return {
    detail: `${url} (from ${source})`,
    fix: null,
    id: 'endpoint',
    status: CHECK_STATUS.PASS,
  };
};

/**
 * Check 2b: is an auth token resolvable? Only presence is ever reported.
 *
 * @public
 */
export const checkToken = ({
  layer,
  present,
}: {
  readonly layer: EnvLayer | null;
  readonly present: boolean;
}): DoctorCheck => {
  if (!present) {
    return {
      detail: 'no auth token resolves',
      fix: [
        'Add this line to ~/.openthrottle/.env:',
        'OPENTHROTTLE_MCP_AUTH_TOKEN=<your token>',
      ].join('\n'),
      id: 'token',
      status: CHECK_STATUS.FAIL,
    };
  }
  const source = layer === null ? 'unknown layer' : ENV_LAYER_LABELS[layer];
  return {
    detail: `present (from ${source})`,
    fix: null,
    id: 'token',
    status: CHECK_STATUS.PASS,
  };
};

const SERVER_FIX = [
  'Start the OpenThrottle server (pnpm nx run openthrottle-server:dev),',
  'or point OPENTHROTTLE_GRAPHQL_URL in ~/.openthrottle/.env at one that is running.',
].join('\n');

/**
 * Check 3: does `GET <origin>/health` answer 2xx within the timeout?
 *
 * @public
 */
export const checkReachability = ({
  origin,
  probe,
}: {
  readonly origin: string | null;
  readonly probe: HealthProbe;
}): DoctorCheck => {
  const target = origin === null ? 'the server' : origin;
  switch (probe.kind) {
    case 'ok':
      return {
        detail: `${target}/health answered ${probe.status} in ${probe.ms}ms`,
        fix: null,
        id: 'reachability',
        status: CHECK_STATUS.PASS,
      };
    case 'http':
      return {
        detail: `${target}/health answered ${probe.status}`,
        fix: `${SERVER_FIX}\nIf it is running, check that the URL is an OpenThrottle server and not a proxy.`,
        id: 'reachability',
        status: CHECK_STATUS.FAIL,
      };
    case 'timeout':
      return {
        detail: `${target}/health timed out`,
        fix: SERVER_FIX,
        id: 'reachability',
        status: CHECK_STATUS.FAIL,
      };
    case 'error':
      return {
        detail: `${target}/health unreachable: ${probe.reason}`,
        fix: SERVER_FIX,
        id: 'reachability',
        status: CHECK_STATUS.FAIL,
      };
    case 'skipped':
      return {
        detail: 'skipped: no endpoint to probe',
        fix: null,
        id: 'reachability',
        status: CHECK_STATUS.WARN,
      };
  }
};

/**
 * Check 4: is anything stuck in the local buffer?
 *
 * @public
 */
export const checkBuffer = ({
  drainCommand,
  nowMs,
  serverHealthy,
  stats,
}: {
  readonly drainCommand: string;
  readonly nowMs: number;
  readonly serverHealthy: boolean;
  readonly stats: BufferStats;
}): DoctorCheck => {
  const oldestMs =
    stats.oldestAt === null ? Number.NaN : new Date(stats.oldestAt).getTime();
  const ageMs = nowMs - oldestMs;
  const isStale = !Number.isNaN(ageMs) && ageMs > STALE_BUFFER_MS;
  const hasLines = stats.totalLines > 0;
  const hasDead = stats.totalDeadLetterLines > 0;
  if (!hasLines && !hasDead) {
    return {
      detail: 'buffer empty',
      fix: null,
      id: 'buffer',
      status: CHECK_STATUS.PASS,
    };
  }

  const counts = stats.files
    .filter((file) => file.lines > 0 || file.deadLetterLines > 0)
    .map((file) => `${file.label}=${file.lines}`)
    .join(' ');
  const parts = [`${stats.totalLines} buffered (${counts})`];
  if (hasDead) {
    parts.push(`${stats.totalDeadLetterLines} dead-lettered`);
  }
  if (!Number.isNaN(ageMs) && hasLines) {
    parts.push(`oldest ${formatAge(ageMs)} ago${isStale ? ' (over 24h)' : ''}`);
  }

  const fixes: string[] = [];
  if (hasLines && serverHealthy) {
    fixes.push(`node ${drainCommand}`);
  }
  if (hasLines && !serverHealthy) {
    fixes.push(
      'Fix the server connection first; the buffer then drains itself.',
    );
  }
  if (hasDead) {
    fixes.push(`node ${drainCommand} --replay-dead-letter`);
  }
  return {
    detail: parts.join(', '),
    fix: fixes.join('\n'),
    id: 'buffer',
    status: CHECK_STATUS.WARN,
  };
};

/**
 * Check 5: did the last SessionStart heartbeat go through?
 *
 * @public
 */
export const checkHeartbeat = ({
  nowMs,
  receipt,
}: {
  readonly nowMs: number;
  readonly receipt: ParsedReceipt | null;
}): DoctorCheck => {
  if (receipt === null) {
    return {
      detail: 'no session has started since the heartbeat hook was installed',
      fix: null,
      id: 'heartbeat',
      status: CHECK_STATUS.WARN,
    };
  }
  const attemptedMs = new Date(receipt.attemptedAt).getTime();
  const age = Number.isNaN(attemptedMs)
    ? 'at an unknown time'
    : `${formatAge(nowMs - attemptedMs)} ago`;
  if (!receipt.delivered) {
    const reason = receipt.error ?? 'unknown error';
    return {
      detail: `last heartbeat ${age} was not delivered: ${reason}`,
      fix: null,
      id: 'heartbeat',
      status: CHECK_STATUS.WARN,
    };
  }
  return {
    detail: `last heartbeat delivered ${age}`,
    fix: null,
    id: 'heartbeat',
    status: CHECK_STATUS.PASS,
  };
};

/**
 * Check 6: is the offline kill switch on?
 *
 * @public
 */
export const checkOffline = ({
  offline,
}: {
  readonly offline: boolean;
}): DoctorCheck => {
  if (!offline) {
    return {
      detail: 'OPENTHROTTLE_TELEMETRY_OFFLINE is not set',
      fix: null,
      id: 'offline',
      status: CHECK_STATUS.PASS,
    };
  }
  return {
    detail: `OPENTHROTTLE_TELEMETRY_OFFLINE=1: nothing is sent, records only buffer`,
    fix: 'unset OPENTHROTTLE_TELEMETRY_OFFLINE (and remove it from your shell profile or ~/.openthrottle/.env)',
    id: 'offline',
    status: CHECK_STATUS.WARN,
  };
};

/**
 * Count results by status.
 *
 * @public
 */
export const summarizeChecks = (
  checks: readonly DoctorCheck[],
): DoctorSummary => {
  const count = (status: CheckStatus): number => {
    return checks.filter((check) => check.status === status).length;
  };
  return {
    fail: count(CHECK_STATUS.FAIL),
    pass: count(CHECK_STATUS.PASS),
    warn: count(CHECK_STATUS.WARN),
  };
};
