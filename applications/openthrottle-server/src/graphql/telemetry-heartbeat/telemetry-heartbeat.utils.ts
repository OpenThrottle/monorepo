/**
 * @description Pure transition logic for coverage notifications: which
 * coverage warnings a heartbeat newly raised for its machine, and how each is
 * worded as a system alert.
 */

import { TELEMETRY_COVERAGE_WARNING_KINDS } from '../telemetry-coverage/telemetry-coverage.constants.ts';
import type { TelemetryCoverageWarningObject } from '../telemetry-coverage/telemetry-coverage.object.ts';

/**
 * @description Warnings present after a heartbeat that were absent before it,
 * in the after list's order — one per (machine, kind) transition. A kind that
 * stays raised across heartbeats never repeats. MACHINE_SILENT is excluded: a
 * heartbeat can only clear it, never raise it.
 */
export function newCoverageWarnings(
  before: readonly TelemetryCoverageWarningObject[],
  after: readonly TelemetryCoverageWarningObject[],
): TelemetryCoverageWarningObject[] {
  const previous = new Set(before.map((warning) => warning.kind));

  return after.filter(
    (warning) =>
      warning.kind !== TELEMETRY_COVERAGE_WARNING_KINDS.MACHINE_SILENT &&
      !previous.has(warning.kind),
  );
}

/**
 * @description The machine as named in an alert: its label when set, else
 * the first 8 characters of its random id (never the hostname).
 */
export function coverageAlertMachineName(
  machineId: string,
  machineLabel: string | null,
): string {
  const label = machineLabel?.trim();
  if (label !== undefined && label !== '') {
    return label;
  }

  return `machine ${machineId.slice(0, 8)}`;
}

/** @description The alert text: `<machine>: <server warning message>`. */
export function coverageAlertMessage(
  machineName: string,
  warning: TelemetryCoverageWarningObject,
): string {
  return `Telemetry coverage — ${machineName}: ${warning.message}`;
}
