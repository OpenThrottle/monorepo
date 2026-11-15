/**
 * @description Pure helpers for the background-activity registry (OT plan 5767e798): parse the
 * stored Redis shapes, smooth throughput, and derive the ETA and status the query serves.
 */

import {
  BACKGROUND_ACTIVITY_KINDS,
  BACKGROUND_ACTIVITY_MIN_INTERVAL_MS,
  BACKGROUND_ACTIVITY_MIN_INTERVALS,
  BACKGROUND_ACTIVITY_RATE_ALPHA,
  BACKGROUND_ACTIVITY_STALLED_AFTER_MS,
  BACKGROUND_ACTIVITY_STATUSES,
} from './background-activity-registry.constants.ts';
import type {
  BackgroundActivityKind,
  BackgroundActivityRecord,
  BackgroundActivitySample,
  BackgroundActivitySnapshot,
  BackgroundActivityStatus,
} from './background-activity-registry.types.ts';

const KINDS: readonly string[] = Object.values(BACKGROUND_ACTIVITY_KINDS);

function isBackgroundActivityKind(
  value: string | undefined,
): value is BackgroundActivityKind {
  return value !== undefined && KINDS.includes(value);
}

function readFiniteNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }

  const value = Number(raw);

  return Number.isFinite(value) ? value : undefined;
}

/**
 * @description Reads one activity hash (`HGETALL`). Undefined for a missing or malformed hash —
 * an expired key reads as `{}` — so the caller can drop it from the index.
 */
export function parseBackgroundActivityRecord(
  hash: Readonly<Record<string, string>>,
): BackgroundActivityRecord | undefined {
  const { id, kind, label } = hash;
  const done = readFiniteNumber(hash.done);
  const startedAt = readFiniteNumber(hash.startedAt);
  const progressedAt = readFiniteNumber(hash.progressedAt);

  if (
    !id ||
    !isBackgroundActivityKind(kind) ||
    label === undefined ||
    done === undefined ||
    startedAt === undefined
  ) {
    return undefined;
  }

  return {
    done,
    id,
    kind,
    label,
    progressedAt: progressedAt ?? startedAt,
    startedAt,
    total: readFiniteNumber(hash.total) ?? null,
  };
}

/** @description Reads the `"<at>:<done>"` sample list (`LRANGE`), oldest first. */
export function parseBackgroundActivitySamples(
  raw: readonly string[],
): BackgroundActivitySample[] {
  return raw
    .flatMap((entry) => {
      const [atRaw, doneRaw] = entry.split(':');
      const at = readFiniteNumber(atRaw);
      const done = readFiniteNumber(doneRaw);

      return at === undefined || done === undefined ? [] : [{ at, done }];
    })
    .sort((left, right) => {
      return left.at - right.at;
    });
}

/**
 * @description Smoothed throughput in units per second: samples are merged into intervals at
 * least {@link BACKGROUND_ACTIVITY_MIN_INTERVAL_MS} long, then each interval's rate feeds an
 * exponentially weighted moving average (newest weighted {@link BACKGROUND_ACTIVITY_RATE_ALPHA}).
 * @returns null with fewer than {@link BACKGROUND_ACTIVITY_MIN_INTERVALS} intervals — not enough
 * signal to promise an ETA.
 */
export function computeSmoothedRate(
  samples: readonly BackgroundActivitySample[],
): number | null {
  const first = samples[0];

  if (!first) {
    return null;
  }

  let anchor = first;
  let rate: number | null = null;
  let intervals = 0;

  for (const sample of samples.slice(1)) {
    const elapsedMs = sample.at - anchor.at;

    if (elapsedMs < BACKGROUND_ACTIVITY_MIN_INTERVAL_MS) {
      continue;
    }

    const intervalRate =
      Math.max(0, sample.done - anchor.done) / (elapsedMs / 1000);

    if (rate === null) {
      rate = intervalRate;
    } else {
      rate =
        BACKGROUND_ACTIVITY_RATE_ALPHA * intervalRate +
        (1 - BACKGROUND_ACTIVITY_RATE_ALPHA) * rate;
    }

    intervals += 1;
    anchor = sample;
  }

  return intervals >= BACKGROUND_ACTIVITY_MIN_INTERVALS ? rate : null;
}

/**
 * @description Seconds until `total` at `rate`, rounded up. Null with no total (indeterminate) or
 * no positive rate; 0 once the work is done.
 */
export function computeEtaSeconds(
  done: number,
  total: number | null,
  rate: number | null,
): number | null {
  if (total === null) {
    return null;
  }

  const remaining = Math.max(0, total - done);

  if (remaining === 0) {
    return 0;
  }

  if (rate === null || rate <= 0) {
    return null;
  }

  return Math.ceil(remaining / rate);
}

/** @description `stalled` once no progress has arrived for the stall window. */
export function resolveBackgroundActivityStatus(
  progressedAt: number,
  now: number,
): BackgroundActivityStatus {
  return now - progressedAt > BACKGROUND_ACTIVITY_STALLED_AFTER_MS
    ? BACKGROUND_ACTIVITY_STATUSES.stalled
    : BACKGROUND_ACTIVITY_STATUSES.running;
}

/**
 * @description The served view of one activity. A stalled activity offers no ETA: its smoothed
 * rate describes a pace that has stopped.
 */
export function toBackgroundActivitySnapshot(
  record: BackgroundActivityRecord,
  samples: readonly BackgroundActivitySample[],
  now: number,
): BackgroundActivitySnapshot {
  const { total } = record;
  const done = total === null ? record.done : Math.min(record.done, total);
  const status = resolveBackgroundActivityStatus(record.progressedAt, now);
  const isRunning = status === BACKGROUND_ACTIVITY_STATUSES.running;
  const rate = isRunning ? computeSmoothedRate(samples) : null;

  return {
    done,
    etaSeconds: computeEtaSeconds(done, total, rate),
    id: record.id,
    kind: record.kind,
    label: record.label,
    startedAt: new Date(record.startedAt),
    status,
    total,
  };
}
