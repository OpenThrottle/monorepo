/**
 * @description Pure coverage logic for telemetryCoverage: semver compare,
 * the six warning rules, and grouping heartbeat rows into machines/repos.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { TelemetryHeartbeat } from '@openthrottle/nestjs-repositories';

import {
  TELEMETRY_COVERAGE_STALE_AFTER_HOURS,
  TELEMETRY_COVERAGE_WARNING_KINDS,
  TELEMETRY_COVERAGE_WARNING_MESSAGES,
} from './telemetry-coverage.constants.ts';
import type {
  TelemetryCoverageWarningObject,
  TelemetryMachineCoverageObject,
  TelemetryRepoCoverageObject,
} from './telemetry-coverage.object.ts';
import type { BuildMachineCoverageOptions } from './telemetry-coverage.types.ts';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const PLUGIN_MANIFEST_PATH = join(
  'plugins',
  'openthrottle',
  '.claude-plugin',
  'plugin.json',
);

function parseSemver(version: string): number[] | null {
  const core = version.trim().replace(/^v/, '').split(/[-+]/)[0] ?? '';
  const parts = core.split('.');
  if (parts.length === 0 || parts.some((part) => !/^\d+$/.test(part))) {
    return null;
  }

  return parts.map(Number);
}

/**
 * @description Numeric semver compare (pre-release/build suffixes ignored).
 * Returns a negative number, 0 or a positive number; null when either side
 * is not a dotted numeric version.
 */
export function compareSemver(a: string, b: string): number | null {
  const left = parseSemver(a);
  const right = parseSemver(b);
  if (left === null || right === null) {
    return null;
  }
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

/**
 * @description Reads the plugin version from plugin.json under the OT repo
 * root. Fail-open: any problem yields null.
 */
export function readCurrentPluginVersion(
  root: string | undefined,
): string | null {
  if (root === undefined) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(join(root, PLUGIN_MANIFEST_PATH), 'utf8'),
    );
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      typeof parsed.version === 'string'
    ) {
      return parsed.version;
    }

    return null;
  } catch {
    return null;
  }
}

export function isManualSessionsUncovered(newest: TelemetryHeartbeat): boolean {
  return newest.marketplacePluginInstalled === false;
}

export function isPluginOutdated(
  marketplacePluginVersion: string | null,
  currentPluginVersion: string | null,
): boolean {
  if (marketplacePluginVersion === null || currentPluginVersion === null) {
    return false;
  }
  const result = compareSemver(marketplacePluginVersion, currentPluginVersion);

  return result !== null && result < 0;
}

/** Strictly older than the threshold: exactly 24h is not stale. */
export function isBufferStale(
  oldestBufferedAt: Date | null,
  now: Date,
): boolean {
  if (oldestBufferedAt === null) {
    return false;
  }

  return (
    now.getTime() - oldestBufferedAt.getTime() >
    TELEMETRY_COVERAGE_STALE_AFTER_HOURS * HOUR_MS
  );
}

export function isBufferGrowing(
  recentBufferedTotals: readonly number[],
): boolean {
  const [first, second, third] = recentBufferedTotals;
  if (
    recentBufferedTotals.length !== 3 ||
    first === undefined ||
    second === undefined ||
    third === undefined
  ) {
    return false;
  }

  return first < second && second < third;
}

/**
 * @description True when the newest heartbeat reports any dead-lettered
 * record: rows the server rejected outright, which never reach usage.
 */
export function isDeadLettered(newest: TelemetryHeartbeat): boolean {
  return newest.deadLetterCount > 0;
}

export function isMachineSilent(
  rows: readonly TelemetryHeartbeat[],
  windowStart: Date,
): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) => row.lastSeenAt.getTime() < windowStart.getTime())
  );
}

function warning(
  kind: keyof typeof TELEMETRY_COVERAGE_WARNING_KINDS,
): TelemetryCoverageWarningObject {
  return { kind, message: TELEMETRY_COVERAGE_WARNING_MESSAGES[kind] };
}

function newestFirst(
  rows: readonly TelemetryHeartbeat[],
): TelemetryHeartbeat[] {
  return [...rows].sort(
    (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime(),
  );
}

/**
 * @description Warnings for one machine's rows, newest first.
 */
export function computeWarnings(
  rows: readonly TelemetryHeartbeat[],
  options: BuildMachineCoverageOptions,
): TelemetryCoverageWarningObject[] {
  const [newest] = newestFirst(rows);
  if (newest === undefined) {
    return [];
  }
  const windowStart = new Date(
    options.now.getTime() - options.windowDays * DAY_MS,
  );
  const warnings: TelemetryCoverageWarningObject[] = [];
  if (isManualSessionsUncovered(newest)) {
    warnings.push(
      warning(TELEMETRY_COVERAGE_WARNING_KINDS.MANUAL_SESSIONS_UNCOVERED),
    );
  }
  if (
    isPluginOutdated(
      newest.marketplacePluginVersion,
      options.currentPluginVersion,
    )
  ) {
    warnings.push(warning(TELEMETRY_COVERAGE_WARNING_KINDS.PLUGIN_OUTDATED));
  }
  if (isBufferStale(newest.oldestBufferedAt, options.now)) {
    warnings.push(warning(TELEMETRY_COVERAGE_WARNING_KINDS.BUFFER_STALE));
  }
  if (isBufferGrowing(newest.recentBufferedTotals)) {
    warnings.push(warning(TELEMETRY_COVERAGE_WARNING_KINDS.BUFFER_GROWING));
  }
  if (isDeadLettered(newest)) {
    warnings.push(warning(TELEMETRY_COVERAGE_WARNING_KINDS.DEAD_LETTERED));
  }
  if (isMachineSilent(rows, windowStart)) {
    warnings.push(warning(TELEMETRY_COVERAGE_WARNING_KINDS.MACHINE_SILENT));
  }

  return warnings;
}

/**
 * @description Groups a machine's rows by repo identity (null = no remote),
 * deduping delivery legs to their newest lastSeenAt. Repos are ordered by
 * newest activity, legs by name.
 */
export function groupRepos(
  rows: readonly TelemetryHeartbeat[],
): TelemetryRepoCoverageObject[] {
  const byRepo = new Map<string | null, Map<string, Date>>();
  for (const row of newestFirst(rows)) {
    const legs = byRepo.get(row.repoIdentity) ?? new Map<string, Date>();
    if (!legs.has(row.deliveryLeg)) {
      legs.set(row.deliveryLeg, row.lastSeenAt);
    }
    byRepo.set(row.repoIdentity, legs);
  }

  return [...byRepo.entries()].map(([repoIdentity, legs]) => {
    return {
      deliveryLegs: [...legs.entries()]
        .map(([deliveryLeg, lastSeenAt]) => ({ deliveryLeg, lastSeenAt }))
        .sort((a, b) => a.deliveryLeg.localeCompare(b.deliveryLeg)),
      repoIdentity,
    };
  });
}

/**
 * @description Groups heartbeat rows into one coverage entry per machine,
 * ordered by lastSeenAt descending.
 */
export function buildMachineCoverage(
  rows: readonly TelemetryHeartbeat[],
  options: BuildMachineCoverageOptions,
): TelemetryMachineCoverageObject[] {
  const byMachine = new Map<string, TelemetryHeartbeat[]>();
  for (const row of rows) {
    byMachine.set(row.machineId, [
      ...(byMachine.get(row.machineId) ?? []),
      row,
    ]);
  }

  const machines: TelemetryMachineCoverageObject[] = [];
  for (const [machineId, machineRows] of byMachine) {
    const sorted = newestFirst(machineRows);
    const [newest] = sorted;
    if (newest === undefined) {
      continue;
    }
    machines.push({
      buffer: {
        bufferedEvents: newest.bufferedEvents,
        bufferedOutcomes: newest.bufferedOutcomes,
        bufferedTokenUsage: newest.bufferedTokenUsage,
        bufferedTrajectories: newest.bufferedTrajectories,
        deadLetterCount: newest.deadLetterCount,
        oldestBufferedAt: newest.oldestBufferedAt,
        totalBuffered:
          newest.bufferedEvents +
          newest.bufferedOutcomes +
          newest.bufferedTokenUsage +
          newest.bufferedTrajectories,
      },
      deliveryLegsSeen: [
        ...new Set(sorted.map((row) => row.deliveryLeg)),
      ].sort(),
      lastSeenAt: newest.lastSeenAt,
      machineId,
      machineLabel: newest.machineLabel,
      marketplacePluginInstalled: newest.marketplacePluginInstalled,
      marketplacePluginVersion: newest.marketplacePluginVersion,
      pluginVersion:
        sorted.find((row) => row.pluginVersion !== null)?.pluginVersion ?? null,
      repos: groupRepos(sorted),
      warnings: computeWarnings(sorted, options),
    });
  }

  return machines.sort(
    (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime(),
  );
}
