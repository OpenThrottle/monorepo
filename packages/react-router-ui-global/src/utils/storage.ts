import { GetRootMetricsQuery } from '@openthrottle/openthrottle-developer-codegen';
import {
  GLOBAL_METRICS_STORAGE_KEY,
  GLOBAL_METRICS_VALID_INTERVALS,
} from '../config/index';

type ServerMetricsSnapshot = GetRootMetricsQuery['serverMetrics'];

/**
 * @description Namespaced storage key; bump suffix when the on-disk JSON shape changes.
 */
export const GLOBAL_METRICS_CHART_HISTORY_STORAGE_KEY = `openthrottle-developer:globalMetricsChartHistory:v1`;

/**
 * @description Schema version stored inside the JSON payload (must match parsers).
 */
export const GLOBAL_METRICS_CHART_HISTORY_SCHEMA_VERSION = 1 as const;

/**
 * @description Maximum samples kept in memory and mirrored to storage (trimmed tail).
 */
export const GLOBAL_METRICS_CHART_MAX_SAMPLES = 25;

/**
 * @description Default TTL for restored history: older {@link StoredMetricsChartHistoryPayload.savedAt} values are ignored.
 */
export const GLOBAL_METRICS_CHART_HISTORY_DEFAULT_MAX_AGE_MS =
  1000 * 60 * 60 * 24;

/** One sample in the metrics history for the time-series chart. */
export interface MetricsChartDatum extends ServerMetricsSnapshot {
  readonly i: number;
}

interface StoredMetricsChartHistoryPayload {
  readonly savedAt: number;
  readonly samples: readonly MetricsChartDatum[];
  readonly v: typeof GLOBAL_METRICS_CHART_HISTORY_SCHEMA_VERSION;
}

const METRIC_NUM_KEYS: readonly (keyof ServerMetricsSnapshot)[] = [
  'cpuSystemMs',
  'cpuUserMs',
  'externalMb',
  'heapTotalMb',
  'heapUsedMb',
  'rssMb',
];

/**
 * @description Returns session-backed storage when running in the browser.
 */
const getSessionChartStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;

  return window.sessionStorage;
};

/**
 * @description Reads persisted poll interval from localStorage; returns null if missing or invalid.
 */
export function getStoredPollIntervalMs(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(GLOBAL_METRICS_STORAGE_KEY);
    if (raw == null) return null;

    const n = Number(raw);

    return Number.isFinite(n) && GLOBAL_METRICS_VALID_INTERVALS.has(n)
      ? n
      : null;
  } catch {
    return null;
  }
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * @description Validates one chart row (metrics fields + sequential index `i`).
 */
const isMetricsChartDatum = (value: unknown): value is MetricsChartDatum => {
  if (!isPlainObject(value)) {
    return false;
  }

  if (!isFiniteNumber(value.i) || !Number.isInteger(value.i) || value.i < 0) {
    return false;
  }

  for (const key of METRIC_NUM_KEYS) {
    if (!isFiniteNumber(value[key])) return false;
  }

  return true;
};

/**
 * @description Trims to {@link GLOBAL_METRICS_CHART_MAX_SAMPLES} and reindexes `i` from 0.
 */
export const trimMetricsChartData = (
  samples: readonly MetricsChartDatum[],
): readonly MetricsChartDatum[] => {
  const tail = samples.slice(-GLOBAL_METRICS_CHART_MAX_SAMPLES);

  return tail.map((row, idx) => ({ ...row, i: idx }));
};

const parsePayload = (raw: string): StoredMetricsChartHistoryPayload | null => {
  let parsed: unknown;
  try {
    const candidate: unknown = JSON.parse(raw);
    parsed = candidate;
  } catch {
    return null;
  }

  if (!isPlainObject(parsed)) return null;

  if (parsed.v !== GLOBAL_METRICS_CHART_HISTORY_SCHEMA_VERSION) return null;

  if (!isFiniteNumber(parsed.savedAt) || !Number.isInteger(parsed.savedAt)) {
    return null;
  }

  if (!Array.isArray(parsed.samples)) return null;

  const samples: MetricsChartDatum[] = [];
  for (const item of parsed.samples) {
    if (!isMetricsChartDatum(item)) return null;
    samples.push(item);
  }

  return {
    samples,
    savedAt: parsed.savedAt,
    v: parsed.v,
  };
};

/**
 * @description Reads persisted chart samples. Returns empty array when missing, corrupt, expired, or not in a browser.
 *
 * @param maxAgeMs When set, drops payloads older than this many ms compared to `Date.now()` (uses payload `savedAt`). When omitted, uses {@link GLOBAL_METRICS_CHART_HISTORY_DEFAULT_MAX_AGE_MS}.
 */
export const readStoredMetricsChartHistory = (
  maxAgeMs: number = GLOBAL_METRICS_CHART_HISTORY_DEFAULT_MAX_AGE_MS,
): readonly MetricsChartDatum[] => {
  const storage = getSessionChartStorage();
  if (storage == null) {
    console.log('⏲︎ 🔴 HISTORYs storage is null');
    return [];
  }

  let raw: string | null;
  try {
    raw = storage.getItem(GLOBAL_METRICS_CHART_HISTORY_STORAGE_KEY);
    console.log('⏲︎ 🟢 🟡 🟢 READ', JSON.parse(raw ?? '{}'));
  } catch {
    return [];
  }

  if (raw == null) return [];

  const payload = parsePayload(raw);
  if (payload == null) return [];

  const ageMs = Date.now() - payload.savedAt;
  if (!Number.isFinite(ageMs) || ageMs > maxAgeMs) return [];

  return trimMetricsChartData(payload.samples);
};

/**
 * @description Persists trimmed samples with a fresh `savedAt`. Ignores quota and access errors.
 */
export const writeStoredMetricsChartHistory = (
  samples: readonly MetricsChartDatum[],
): void => {
  const storage = getSessionChartStorage();
  if (storage == null) return;

  const trimmed = trimMetricsChartData(samples);
  const body: StoredMetricsChartHistoryPayload = {
    samples: trimmed,
    savedAt: Date.now(),
    v: GLOBAL_METRICS_CHART_HISTORY_SCHEMA_VERSION,
  };

  try {
    storage.setItem(
      GLOBAL_METRICS_CHART_HISTORY_STORAGE_KEY,
      JSON.stringify(body),
    );
  } catch {
    // QuotaExceededError and private mode — ignore
  }
};
