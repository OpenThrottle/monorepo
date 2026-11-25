/**
 * @description Parses job returnvalue JSON and returns TaskRunMetricsObject when queue is plans
 * and returnvalue contains taskRunMetrics. Used by JobObject.taskRunMetrics resolver.
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import { ChildProcessMetricsObject } from '../metrics/child-process-metrics.object.ts';
import {
  ContainerCpuWindowObject,
  ContainerMemoryEventsObject,
  ContainerMetricsObject,
} from '../metrics/container-metrics.object.ts';
import type { MetricScopeValue } from '../metrics/metric-scope.enum.ts';
import { METRIC_SCOPE } from '../metrics/metric-scope.enum.ts';
import { ProcessMetricsSnapshotObject } from '../metrics/process-metrics-snapshot.object.ts';
import { PsiCpuMetricsObject } from '../metrics/psi-cpu-metrics.object.ts';
import type { PressureLevelValue } from '../metrics/system-cpu-metrics.object.ts';
import {
  LoadAverageMetricsObject,
  PRESSURE_LEVEL,
  SystemCpuMetricsObject,
  SystemCpuSnapshotObject,
} from '../metrics/system-cpu-metrics.object.ts';
import { TaskRunMetricsObject } from '../metrics/task-run-metrics.object.ts';
import type { WallClockInterpretationValue } from '../metrics/wall-clock-metrics.object.ts';
import {
  WALL_CLOCK_INTERPRETATION,
  WallClockMetricsObject,
} from '../metrics/wall-clock-metrics.object.ts';

/**
 * @description Reads a required numeric field. The default is unreachable when
 * the caller's type guard has already validated the field is a number.
 */
function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === 'number' ? value : 0;
}

/**
 * @description Reads a nullable numeric field, preserving explicit nulls. When
 * the value is neither a number nor null (rejected by the caller's guard) it
 * falls back to null.
 */
function readNullableNumber(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const value = record[key];
  return typeof value === 'number' ? value : null;
}

/**
 * @description Reads a required string field. The default is unreachable when
 * the caller's type guard has already validated the field is a string.
 */
function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

/**
 * @description Reads a required boolean field. The default is unreachable when
 * the caller's type guard has already validated the field is a boolean.
 */
function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  return typeof value === 'boolean' ? value : false;
}

/**
 * @description Reads a nested record field. The default is unreachable when the
 * caller's type guard has already validated the field is a record.
 */
function readRecord(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const value = record[key];
  return isRecord(value) ? value : {};
}

/**
 * @description Reads an optional MetricScope; anything else (absent on older runs) is null.
 */
function readNullableScope(
  record: Record<string, unknown>,
  key: string,
): MetricScopeValue | null {
  const value = record[key];
  switch (value) {
    case METRIC_SCOPE.container:
    case METRIC_SCOPE.host:
    case METRIC_SCOPE.process:
      return value;
    default:
      return null;
  }
}

/**
 * @description Reads a nullable string field.
 */
function readNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/**
 * @description Reads the wall-clock interpretation enum. The upstream guard only
 * verifies the field is a string, so an unrecognized string is coerced to
 * `mixed` here (previously it was stored verbatim via an `as` cast, which would
 * have produced an invalid GraphQL enum value at serialization time).
 */
function readWallClockInterpretation(
  record: Record<string, unknown>,
  key: string,
): WallClockInterpretationValue {
  const value = record[key];
  switch (value) {
    case WALL_CLOCK_INTERPRETATION.cpu_bound:
    case WALL_CLOCK_INTERPRETATION.idle:
    case WALL_CLOCK_INTERPRETATION.io_bound:
    case WALL_CLOCK_INTERPRETATION.mixed:
      return value;
    default:
      return WALL_CLOCK_INTERPRETATION.mixed;
  }
}

/**
 * @description Reads the pressure-level enum. The upstream guard only verifies
 * the field is a string, so an unrecognized string is coerced to `unknown` here
 * (previously it was stored verbatim via an `as` cast, which would have produced
 * an invalid GraphQL enum value at serialization time).
 */
function readPressureLevel(
  record: Record<string, unknown>,
  key: string,
): PressureLevelValue {
  const value = record[key];
  switch (value) {
    case PRESSURE_LEVEL.high:
    case PRESSURE_LEVEL.low:
    case PRESSURE_LEVEL.moderate:
    case PRESSURE_LEVEL.unknown:
      return value;
    default:
      return PRESSURE_LEVEL.unknown;
  }
}

const SNAPSHOT_KEYS = [
  'rssMb',
  'heapUsedMb',
  'heapTotalMb',
  'externalMb',
  'cpuUserMs',
  'cpuSystemMs',
] as const;

const CHILD_PROCESS_KEYS = [
  'pid',
  'peakCpuPercent',
  'avgCpuPercent',
  'peakRssMb',
  'avgRssMb',
  'sampleCount',
  'pollIntervalMs',
] as const;

const WALL_CLOCK_KEYS = [
  'wallClockMs',
  'cpuUserMs',
  'cpuSystemMs',
  'cpuTimeMs',
  'wallClockToCpuRatio',
  'startTimestamp',
  'endTimestamp',
  'interpretation',
] as const;

function isProcessSnapshot(
  value: unknown,
): value is Record<(typeof SNAPSHOT_KEYS)[number], number> {
  if (!isRecord(value)) {
    return false;
  }
  const obj = value;
  for (const key of SNAPSHOT_KEYS) {
    if (typeof obj[key] !== 'number') {
      return false;
    }
  }
  return true;
}

function isChildProcessMetrics(
  value: unknown,
): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }
  const obj = value;
  for (const key of CHILD_PROCESS_KEYS) {
    if (typeof obj[key] !== 'number') {
      return false;
    }
  }
  return true;
}

function isWallClockMetrics(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }
  const obj = value;
  for (const key of WALL_CLOCK_KEYS) {
    if (key === 'interpretation') {
      if (typeof obj[key] !== 'string') {
        return false;
      }
    } else if (typeof obj[key] !== 'number') {
      return false;
    }
  }
  return true;
}

function isLoadAverageMetrics(
  value: unknown,
): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }
  const obj = value;
  const keys = ['load1m', 'load5m', 'load15m', 'cpuCount', 'perCoreLoad1m'];
  for (const key of keys) {
    if (typeof obj[key] !== 'number') {
      return false;
    }
  }
  return true;
}

function isPsiCpuMetrics(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }
  const obj = value;
  const keys = [
    'some10s',
    'some60s',
    'some300s',
    'full10s',
    'full60s',
    'full300s',
    'someTotalUs',
    'fullTotalUs',
  ];
  for (const key of keys) {
    const val = obj[key];
    if (val !== null && typeof val !== 'number') {
      return false;
    }
  }
  return true;
}

function isSystemCpuSnapshot(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }
  const obj = value;
  if (typeof obj['timestamp'] !== 'number') {
    return false;
  }
  if (!isLoadAverageMetrics(obj['loadAverage'])) {
    return false;
  }
  if (!isPsiCpuMetrics(obj['psi'])) {
    return false;
  }
  return true;
}

function isSystemCpuMetrics(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }
  const obj = value;
  if (typeof obj['platform'] !== 'string') {
    return false;
  }
  if (typeof obj['psiAvailable'] !== 'boolean') {
    return false;
  }
  if (typeof obj['pressureLevel'] !== 'string') {
    return false;
  }
  if (!isSystemCpuSnapshot(obj['atStart'])) {
    return false;
  }
  if (!isSystemCpuSnapshot(obj['atEnd'])) {
    return false;
  }
  const psiSomeDeltaUs = obj['psiSomeDeltaUs'];
  if (psiSomeDeltaUs !== null && typeof psiSomeDeltaUs !== 'number') {
    return false;
  }
  const psiFullDeltaUs = obj['psiFullDeltaUs'];
  if (psiFullDeltaUs !== null && typeof psiFullDeltaUs !== 'number') {
    return false;
  }
  return true;
}

function toProcessMetricsSnapshotObject(
  raw: Record<(typeof SNAPSHOT_KEYS)[number], number>,
): ProcessMetricsSnapshotObject {
  const out = new ProcessMetricsSnapshotObject();
  out.rssMb = raw.rssMb;
  out.heapUsedMb = raw.heapUsedMb;
  out.heapTotalMb = raw.heapTotalMb;
  out.externalMb = raw.externalMb;
  out.cpuUserMs = raw.cpuUserMs;
  out.cpuSystemMs = raw.cpuSystemMs;
  return out;
}

function toChildProcessMetricsObject(
  raw: Record<string, unknown>,
): ChildProcessMetricsObject {
  const out = new ChildProcessMetricsObject();
  out.avgCpuPercent = readNumber(raw, 'avgCpuPercent');
  out.avgRssMb = readNumber(raw, 'avgRssMb');
  out.peakCpuPercent = readNumber(raw, 'peakCpuPercent');
  out.peakRssMb = readNumber(raw, 'peakRssMb');
  out.pid = readNumber(raw, 'pid');
  out.pollIntervalMs = readNumber(raw, 'pollIntervalMs');
  out.sampleCount = readNumber(raw, 'sampleCount');
  return out;
}

function toWallClockMetricsObject(
  raw: Record<string, unknown>,
): WallClockMetricsObject {
  const out = new WallClockMetricsObject();
  out.cpuSystemMs = readNumber(raw, 'cpuSystemMs');
  out.cpuTimeMs = readNumber(raw, 'cpuTimeMs');
  out.cpuUserMs = readNumber(raw, 'cpuUserMs');
  out.endTimestamp = readNumber(raw, 'endTimestamp');
  out.interpretation = readWallClockInterpretation(raw, 'interpretation');
  out.startTimestamp = readNumber(raw, 'startTimestamp');
  out.wallClockMs = readNumber(raw, 'wallClockMs');
  out.wallClockToCpuRatio = readNumber(raw, 'wallClockToCpuRatio');
  return out;
}

function toLoadAverageMetricsObject(
  raw: Record<string, unknown>,
): LoadAverageMetricsObject {
  const out = new LoadAverageMetricsObject();
  out.cpuCount = readNumber(raw, 'cpuCount');
  out.load15m = readNumber(raw, 'load15m');
  out.load1m = readNumber(raw, 'load1m');
  out.load5m = readNumber(raw, 'load5m');
  out.perCoreLoad1m = readNumber(raw, 'perCoreLoad1m');
  out.scope = readNullableScope(raw, 'scope');
  return out;
}

function toPsiCpuMetricsObject(
  raw: Record<string, unknown>,
): PsiCpuMetricsObject {
  const out = new PsiCpuMetricsObject();
  out.full10s = readNullableNumber(raw, 'full10s');
  out.full300s = readNullableNumber(raw, 'full300s');
  out.full60s = readNullableNumber(raw, 'full60s');
  out.fullTotalUs = readNullableNumber(raw, 'fullTotalUs');
  out.some10s = readNullableNumber(raw, 'some10s');
  out.some300s = readNullableNumber(raw, 'some300s');
  out.some60s = readNullableNumber(raw, 'some60s');
  out.someTotalUs = readNullableNumber(raw, 'someTotalUs');
  out.scope = readNullableScope(raw, 'scope');
  return out;
}

function toContainerCpuWindowObject(
  value: unknown,
): ContainerCpuWindowObject | null {
  if (!isRecord(value) || typeof value['elapsedMs'] !== 'number') {
    return null;
  }
  const out = new ContainerCpuWindowObject();
  out.elapsedMs = value['elapsedMs'];
  out.throttledPeriodRatio = readNullableNumber(value, 'throttledPeriodRatio');
  out.usageRatioOfLimit = readNullableNumber(value, 'usageRatioOfLimit');
  out.usedVcpus = readNullableNumber(value, 'usedVcpus');
  return out;
}

function toContainerMemoryEventsObject(
  value: unknown,
): ContainerMemoryEventsObject | null {
  if (!isRecord(value)) {
    return null;
  }
  const out = new ContainerMemoryEventsObject();
  out.high = readNumber(value, 'high');
  out.max = readNumber(value, 'max');
  out.oom = readNumber(value, 'oom');
  out.oomKill = readNumber(value, 'oomKill');
  return out;
}

/**
 * @description Reads a stored cgroup union (`kind: 'cgroup' | 'unavailable'`) into the
 * flattened ContainerMetricsObject. Null when absent (runs recorded before container metrics).
 */
function toContainerMetricsObjectFromRaw(
  value: unknown,
): ContainerMetricsObject | null {
  if (!isRecord(value)) {
    return null;
  }
  const out = new ContainerMetricsObject();
  out.scope = 'container';
  if (value['kind'] !== 'cgroup') {
    out.available = false;
    out.cpu = null;
    out.cpuWindow = null;
    out.memory = null;
    out.path = null;
    out.psi = null;
    out.unavailableReason = readNullableString(value, 'reason');
    return out;
  }
  const cpu = readRecord(value, 'cpu');
  const memory = readRecord(value, 'memory');
  out.available = true;
  out.cpu = {
    limitVcpus: readNullableNumber(cpu, 'limitVcpus'),
    nrPeriods: readNullableNumber(cpu, 'nrPeriods'),
    nrThrottled: readNullableNumber(cpu, 'nrThrottled'),
    throttledUsec: readNullableNumber(cpu, 'throttledUsec'),
    usageUsec: readNullableNumber(cpu, 'usageUsec'),
  };
  out.cpuWindow = toContainerCpuWindowObject(value['cpuWindow']);
  out.memory = {
    currentBytes: readNullableNumber(memory, 'currentBytes'),
    events: toContainerMemoryEventsObject(memory['events']),
    highBytes: readNullableNumber(memory, 'highBytes'),
    limitBytes: readNullableNumber(memory, 'limitBytes'),
  };
  out.path = readNullableString(value, 'path');
  out.psi = toPsiCpuMetricsObject(readRecord(value, 'psi'));
  out.unavailableReason = null;
  return out;
}

function toSystemCpuSnapshotObject(
  raw: Record<string, unknown>,
): SystemCpuSnapshotObject {
  const out = new SystemCpuSnapshotObject();
  out.container = toContainerMetricsObjectFromRaw(raw['container']);
  out.loadAverage = toLoadAverageMetricsObject(readRecord(raw, 'loadAverage'));
  out.psi = toPsiCpuMetricsObject(readRecord(raw, 'psi'));
  out.timestamp = readNumber(raw, 'timestamp');
  return out;
}

function toSystemCpuMetricsObject(
  raw: Record<string, unknown>,
): SystemCpuMetricsObject {
  const out = new SystemCpuMetricsObject();
  out.atEnd = toSystemCpuSnapshotObject(readRecord(raw, 'atEnd'));
  out.atStart = toSystemCpuSnapshotObject(readRecord(raw, 'atStart'));
  out.containerCpuWindow = toContainerCpuWindowObject(
    raw['containerCpuWindow'],
  );
  out.platform = readString(raw, 'platform');
  out.pressureBasis = readNullableScope(raw, 'pressureBasis');
  out.pressureLevel = readPressureLevel(raw, 'pressureLevel');
  out.psiAvailable = readBoolean(raw, 'psiAvailable');
  out.psiFullDeltaUs = readNullableNumber(raw, 'psiFullDeltaUs');
  out.psiSomeDeltaUs = readNullableNumber(raw, 'psiSomeDeltaUs');
  return out;
}

/**
 * @description Parses returnvalue JSON string and returns TaskRunMetricsObject if it contains valid taskRunMetrics; otherwise null.
 */
export function parseTaskRunMetricsFromReturnvalue(
  returnvalue: string | null,
): TaskRunMetricsObject | null {
  if (returnvalue == null || returnvalue === '') {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(returnvalue);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  const obj = parsed;
  const taskRunMetrics = obj['taskRunMetrics'];
  if (!isRecord(taskRunMetrics)) {
    return null;
  }
  const metrics = taskRunMetrics;
  const atStart = metrics['atStart'];
  const atEnd = metrics['atEnd'];
  if (!isProcessSnapshot(atStart) || !isProcessSnapshot(atEnd)) {
    return null;
  }

  const result = new TaskRunMetricsObject();
  result.atStart = toProcessMetricsSnapshotObject(atStart);
  result.atEnd = toProcessMetricsSnapshotObject(atEnd);

  const childProcessMetrics = metrics['childProcessMetrics'];
  if (isChildProcessMetrics(childProcessMetrics)) {
    result.childProcessMetrics =
      toChildProcessMetricsObject(childProcessMetrics);
  }

  const wallClockMetrics = metrics['wallClockMetrics'];
  if (isWallClockMetrics(wallClockMetrics)) {
    result.wallClockMetrics = toWallClockMetricsObject(wallClockMetrics);
  }

  const systemCpuMetrics = metrics['systemCpuMetrics'];
  if (isSystemCpuMetrics(systemCpuMetrics)) {
    result.systemCpuMetrics = toSystemCpuMetricsObject(systemCpuMetrics);
  }

  return result;
}
