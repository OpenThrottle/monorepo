/**
 * @description Parses job returnvalue JSON and returns TaskRunMetricsObject when queue is plans
 * and returnvalue contains taskRunMetrics. Used by JobObject.taskRunMetrics resolver.
 */

import { ChildProcessMetricsObject } from '../metrics/child-process-metrics.object';
import { ProcessMetricsSnapshotObject } from '../metrics/process-metrics-snapshot.object';
import {
  LoadAverageMetricsObject,
  PressureLevelType,
  PsiCpuMetricsObject,
  SystemCpuMetricsObject,
  SystemCpuSnapshotObject,
} from '../metrics/system-cpu-metrics.object';
import { TaskRunMetricsObject } from '../metrics/task-run-metrics.object';
import {
  WallClockInterpretationType,
  WallClockMetricsObject,
} from '../metrics/wall-clock-metrics.object';

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
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
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
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  for (const key of CHILD_PROCESS_KEYS) {
    if (typeof obj[key] !== 'number') {
      return false;
    }
  }
  return true;
}

function isWallClockMetrics(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
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
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
  const keys = ['load1m', 'load5m', 'load15m', 'cpuCount', 'perCoreLoad1m'];
  for (const key of keys) {
    if (typeof obj[key] !== 'number') {
      return false;
    }
  }
  return true;
}

function isPsiCpuMetrics(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
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
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
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
  if (value == null || typeof value !== 'object') {
    return false;
  }
  const obj = value as Record<string, unknown>;
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
  out.avgCpuPercent = raw['avgCpuPercent'] as number;
  out.avgRssMb = raw['avgRssMb'] as number;
  out.peakCpuPercent = raw['peakCpuPercent'] as number;
  out.peakRssMb = raw['peakRssMb'] as number;
  out.pid = raw['pid'] as number;
  out.pollIntervalMs = raw['pollIntervalMs'] as number;
  out.sampleCount = raw['sampleCount'] as number;
  return out;
}

function toWallClockMetricsObject(
  raw: Record<string, unknown>,
): WallClockMetricsObject {
  const out = new WallClockMetricsObject();
  out.cpuSystemMs = raw['cpuSystemMs'] as number;
  out.cpuTimeMs = raw['cpuTimeMs'] as number;
  out.cpuUserMs = raw['cpuUserMs'] as number;
  out.endTimestamp = raw['endTimestamp'] as number;
  out.interpretation = raw['interpretation'] as WallClockInterpretationType;
  out.startTimestamp = raw['startTimestamp'] as number;
  out.wallClockMs = raw['wallClockMs'] as number;
  out.wallClockToCpuRatio = raw['wallClockToCpuRatio'] as number;
  return out;
}

function toLoadAverageMetricsObject(
  raw: Record<string, unknown>,
): LoadAverageMetricsObject {
  const out = new LoadAverageMetricsObject();
  out.cpuCount = raw['cpuCount'] as number;
  out.load15m = raw['load15m'] as number;
  out.load1m = raw['load1m'] as number;
  out.load5m = raw['load5m'] as number;
  out.perCoreLoad1m = raw['perCoreLoad1m'] as number;
  return out;
}

function toPsiCpuMetricsObject(
  raw: Record<string, unknown>,
): PsiCpuMetricsObject {
  const out = new PsiCpuMetricsObject();
  out.full10s = raw['full10s'] as number | null;
  out.full300s = raw['full300s'] as number | null;
  out.full60s = raw['full60s'] as number | null;
  out.fullTotalUs = raw['fullTotalUs'] as number | null;
  out.some10s = raw['some10s'] as number | null;
  out.some300s = raw['some300s'] as number | null;
  out.some60s = raw['some60s'] as number | null;
  out.someTotalUs = raw['someTotalUs'] as number | null;
  return out;
}

function toSystemCpuSnapshotObject(
  raw: Record<string, unknown>,
): SystemCpuSnapshotObject {
  const out = new SystemCpuSnapshotObject();
  out.loadAverage = toLoadAverageMetricsObject(
    raw['loadAverage'] as Record<string, unknown>,
  );
  out.psi = toPsiCpuMetricsObject(raw['psi'] as Record<string, unknown>);
  out.timestamp = raw['timestamp'] as number;
  return out;
}

function toSystemCpuMetricsObject(
  raw: Record<string, unknown>,
): SystemCpuMetricsObject {
  const out = new SystemCpuMetricsObject();
  out.atEnd = toSystemCpuSnapshotObject(
    raw['atEnd'] as Record<string, unknown>,
  );
  out.atStart = toSystemCpuSnapshotObject(
    raw['atStart'] as Record<string, unknown>,
  );
  out.platform = raw['platform'] as string;
  out.pressureLevel = raw['pressureLevel'] as PressureLevelType;
  out.psiAvailable = raw['psiAvailable'] as boolean;
  out.psiFullDeltaUs = raw['psiFullDeltaUs'] as number | null;
  out.psiSomeDeltaUs = raw['psiSomeDeltaUs'] as number | null;
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
    parsed = JSON.parse(returnvalue) as unknown;
  } catch {
    return null;
  }
  if (parsed == null || typeof parsed !== 'object') {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const taskRunMetrics = obj['taskRunMetrics'];
  if (taskRunMetrics == null || typeof taskRunMetrics !== 'object') {
    return null;
  }
  const metrics = taskRunMetrics as Record<string, unknown>;
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
