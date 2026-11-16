import * as os from 'os';

import type {
  CgroupCpuSample,
  CgroupCpuWindow,
  CgroupFileContents,
  CgroupMemoryEvents,
  CgroupMetrics,
  CgroupMetricsAvailable,
  HostMemorySnapshot,
  LoadAverageSnapshot,
  PressureLevel,
  PsiSnapshot,
  RunSystemCpuMetrics,
  RunSystemCpuSnapshot,
  SystemMetricsSnapshot,
} from './system-metrics.types.ts';

/**
 * @description Captures a LoadAverageSnapshot from os.loadavg().
 */
export function captureLoadAverage(): LoadAverageSnapshot {
  const [load1m = 0, load5m = 0, load15m = 0] = os.loadavg();
  const cpuCount = os.cpus().length;
  const perCoreLoad1m =
    cpuCount > 0 ? Math.round((load1m / cpuCount) * 100) / 100 : load1m;

  return {
    cpuCount,
    load15m: Math.round(load15m * 100) / 100,
    load1m: Math.round(load1m * 100) / 100,
    load5m: Math.round(load5m * 100) / 100,
    perCoreLoad1m,
    scope: 'host',
  };
}

/**
 * @description Captures host memory from os.totalmem()/os.freemem().
 */
export function captureHostMemory(): HostMemorySnapshot {
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const hasTotal = totalBytes > 0;
  const usedShare = hasTotal ? (totalBytes - freeBytes) / totalBytes : 0;
  const usedRatio = Math.round(usedShare * 100) / 100;
  return { freeBytes, scope: 'host', totalBytes, usedRatio };
}

/**
 * @description Creates an empty PSI snapshot (all nulls).
 */
export function createEmptyPsiSnapshot(
  scope: PsiSnapshot['scope'],
): PsiSnapshot {
  return {
    full10s: null,
    full300s: null,
    full60s: null,
    fullTotalUs: null,
    scope,
    some10s: null,
    some300s: null,
    some60s: null,
    someTotalUs: null,
  };
}

/**
 * @description Determines pressure level from load average and PSI metrics.
 */
export function determinePressureLevel(
  loadAverage: LoadAverageSnapshot,
  psi: PsiSnapshot,
): PressureLevel {
  const { perCoreLoad1m } = loadAverage;
  const psiSome = psi.some10s;

  if (perCoreLoad1m > 1.5 || (psiSome !== null && psiSome > 20)) {
    return 'high';
  }

  if (
    perCoreLoad1m >= 0.7 ||
    (psiSome !== null && psiSome >= 5 && psiSome <= 20)
  ) {
    return 'moderate';
  }

  if (perCoreLoad1m < 0.7 && (psiSome === null || psiSome < 5)) {
    return 'low';
  }

  return 'unknown';
}

interface PsiLineAverages {
  readonly avg10: number;
  readonly avg300: number;
  readonly avg60: number;
  readonly totalUs: number | null;
}

/**
 * @description Parses a PSI line like "some avg10=0.00 avg60=0.00 avg300=0.00 total=0".
 */
function parsePsiLine(line: string): PsiLineAverages | null {
  const match = line.match(/avg10=([\d.]+)\s+avg60=([\d.]+)\s+avg300=([\d.]+)/);
  if (!match) {
    return null;
  }
  const [, avg10 = '', avg60 = '', avg300 = ''] = match;
  const total = line.match(/total=(\d+)/)?.[1];
  return {
    avg10: parseFloat(avg10),
    avg300: parseFloat(avg300),
    avg60: parseFloat(avg60),
    totalUs: total === undefined ? null : Number(total),
  };
}

/**
 * @description Parses a PSI file (`/proc/pressure/cpu` or a cgroup's `cpu.pressure`) into a
 * PsiSnapshot. Missing lines yield nulls; null content yields an empty snapshot.
 */
export function parsePsiContent(
  content: string | null,
  scope: PsiSnapshot['scope'],
): PsiSnapshot {
  if (content === null) {
    return createEmptyPsiSnapshot(scope);
  }
  const lines = content.trim().split('\n');
  const someLine = lines.find((line) => line.startsWith('some '));
  const fullLine = lines.find((line) => line.startsWith('full '));
  const some = someLine === undefined ? null : parsePsiLine(someLine);
  const full = fullLine === undefined ? null : parsePsiLine(fullLine);
  return {
    full10s: full?.avg10 ?? null,
    full300s: full?.avg300 ?? null,
    full60s: full?.avg60 ?? null,
    fullTotalUs: full?.totalUs ?? null,
    scope,
    some10s: some?.avg10 ?? null,
    some300s: some?.avg300 ?? null,
    some60s: some?.avg60 ?? null,
    someTotalUs: some?.totalUs ?? null,
  };
}

/**
 * @description Returns the cgroup v2 path from `/proc/self/cgroup` (the `0::<path>` line),
 * or null when there is none (cgroup v1 only).
 */
export function parseCgroupV2Path(procSelfCgroup: string): string | null {
  const line = procSelfCgroup
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith('0::'));
  if (line === undefined) {
    return null;
  }
  const path = line.slice('0::'.length);
  return path.startsWith('/') ? path : null;
}

/**
 * @description Parses `cpu.max` ("<quota|max> <period>") into vCPUs. Null means unlimited:
 * a `max` quota, a missing file, or content that does not parse.
 */
export function parseCpuMax(content: string | null): number | null {
  if (content === null) {
    return null;
  }
  const [quota = '', period = ''] = content.trim().split(/\s+/);
  const quotaUsec = Number(quota);
  const periodUsec = Number(period);
  if (
    quota === 'max' ||
    !Number.isFinite(quotaUsec) ||
    !Number.isFinite(periodUsec) ||
    periodUsec <= 0
  ) {
    return null;
  }
  return Math.round((quotaUsec / periodUsec) * 1000) / 1000;
}

/**
 * @description Parses a single-value byte file (`memory.max`, `memory.high`,
 * `memory.current`). `max`, a missing file or unparseable content is null.
 */
export function parseCgroupBytes(content: string | null): number | null {
  if (content === null) {
    return null;
  }
  const value = content.trim();
  if (value === '' || value === 'max') {
    return null;
  }
  const bytes = Number(value);
  return Number.isFinite(bytes) ? bytes : null;
}

/**
 * @description Parses a flat-keyed cgroup file (`cpu.stat`, `memory.events`) of
 * "<key> <integer>" lines into a map. Lines that do not parse are skipped.
 */
export function parseFlatKeyed(
  content: string | null,
): ReadonlyMap<string, number> {
  const entries = new Map<string, number>();
  if (content === null) {
    return entries;
  }
  for (const line of content.trim().split('\n')) {
    const [key = '', raw = ''] = line.trim().split(/\s+/);
    const value = Number(raw);
    if (key !== '' && raw !== '' && Number.isFinite(value)) {
      entries.set(key, value);
    }
  }
  return entries;
}

/**
 * @description Parses `memory.events` into the counters that matter for sizing. Null when the
 * file is missing.
 */
export function parseMemoryEvents(
  content: string | null,
): CgroupMemoryEvents | null {
  if (content === null) {
    return null;
  }
  const events = parseFlatKeyed(content);
  return {
    high: events.get('high') ?? 0,
    max: events.get('max') ?? 0,
    oom: events.get('oom') ?? 0,
    oomKill: events.get('oom_kill') ?? 0,
  };
}

/**
 * @description Builds CgroupMetrics from the raw contents of a cgroup v2 directory. A cgroup
 * with no readable accounting file at all is reported unavailable rather than as all-nulls.
 */
export function buildCgroupMetrics(
  path: string,
  files: CgroupFileContents,
): CgroupMetrics {
  const hasAccounting = files.cpuStat !== null || files.memoryCurrent !== null;
  if (!hasAccounting) {
    return {
      kind: 'unavailable',
      reason: `No readable cpu.stat or memory.current under ${path}`,
      scope: 'container',
    };
  }
  const cpuStat = parseFlatKeyed(files.cpuStat);
  return {
    cpu: {
      limitVcpus: parseCpuMax(files.cpuMax),
      nrPeriods: cpuStat.get('nr_periods') ?? null,
      nrThrottled: cpuStat.get('nr_throttled') ?? null,
      throttledUsec: cpuStat.get('throttled_usec') ?? null,
      usageUsec: cpuStat.get('usage_usec') ?? null,
    },
    cpuWindow: null,
    kind: 'cgroup',
    memory: {
      currentBytes: parseCgroupBytes(files.memoryCurrent),
      events: parseMemoryEvents(files.memoryEvents),
      highBytes: parseCgroupBytes(files.memoryHigh),
      limitBytes: parseCgroupBytes(files.memoryMax),
    },
    path,
    psi: parsePsiContent(files.cpuPressure, 'container'),
    scope: 'container',
  };
}

/**
 * @description Rounds a ratio to 3 decimal places.
 */
function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * @description Difference between two reads of a cumulative counter; null if either is missing.
 */
function counterDelta(
  before: number | null,
  after: number | null,
): number | null {
  if (before === null || after === null) {
    return null;
  }
  return after - before;
}

/**
 * @description Computes usage and throttling between two cgroup CPU reads. Null when no time
 * passed or a counter is missing; a counter that went backwards (a new cgroup) also yields null.
 */
export function computeCgroupCpuWindow(
  previous: CgroupCpuSample,
  current: CgroupCpuSample,
): CgroupCpuWindow | null {
  const elapsedMs = current.atMs - previous.atMs;
  const { cpu: before } = previous;
  const { cpu: after } = current;
  if (
    elapsedMs <= 0 ||
    before.usageUsec === null ||
    after.usageUsec === null ||
    after.usageUsec < before.usageUsec
  ) {
    return null;
  }
  const usedVcpus = roundRatio(
    (after.usageUsec - before.usageUsec) / (elapsedMs * 1000),
  );
  const usageRatioOfLimit =
    after.limitVcpus === null ? null : roundRatio(usedVcpus / after.limitVcpus);
  const periods = counterDelta(before.nrPeriods, after.nrPeriods);
  const throttled = counterDelta(before.nrThrottled, after.nrThrottled);
  const hasThrottleCounts =
    periods !== null && throttled !== null && periods > 0 && throttled >= 0;
  const throttledPeriodRatio = hasThrottleCounts
    ? roundRatio(throttled / periods)
    : null;
  return { elapsedMs, throttledPeriodRatio, usageRatioOfLimit, usedVcpus };
}

/**
 * @description Pressure level for a cgroup with a CPU limit, from usage and throttling against
 * that limit and the cgroup's own PSI. Host load is not used: under Docker it counts every
 * other container on the box, so it says nothing about this one's ceiling.
 */
export function determineContainerPressureLevel(
  container: CgroupMetricsAvailable,
): PressureLevel {
  const { cpuWindow, psi } = container;
  const throttled = cpuWindow?.throttledPeriodRatio ?? null;
  const usage = cpuWindow?.usageRatioOfLimit ?? null;
  const psiSome = psi.some10s;
  if (throttled === null && usage === null && psiSome === null) {
    return 'unknown';
  }
  const isHigh =
    (throttled !== null && throttled > 0.25) ||
    (usage !== null && usage > 0.9) ||
    (psiSome !== null && psiSome > 20);
  if (isHigh) {
    return 'high';
  }
  const isModerate =
    (throttled !== null && throttled >= 0.05) ||
    (usage !== null && usage >= 0.7) ||
    (psiSome !== null && psiSome >= 5);
  return isModerate ? 'moderate' : 'low';
}

/**
 * @description Keeps the parts of a system snapshot a plan run records.
 */
function toRunSystemCpuSnapshot(
  snapshot: SystemMetricsSnapshot,
): RunSystemCpuSnapshot {
  return {
    container: snapshot.container,
    loadAverage: snapshot.loadAverage,
    psi: snapshot.psi,
    timestamp: snapshot.timestamp,
  };
}

/**
 * @description Container CPU usage and throttling between a run's start and end snapshots;
 * null unless both readings found a cgroup.
 */
function computeRunCpuWindow(
  start: SystemMetricsSnapshot,
  end: SystemMetricsSnapshot,
): CgroupCpuWindow | null {
  const { container: before } = start;
  const { container: after } = end;
  if (before.kind !== 'cgroup' || after.kind !== 'cgroup') {
    return null;
  }
  return computeCgroupCpuWindow(
    { atMs: start.timestamp, cpu: before.cpu },
    { atMs: end.timestamp, cpu: after.cpu },
  );
}

/**
 * @description Builds a plan run's system CPU metrics from the snapshots taken at its start and
 * end. With a container CPU limit the pressure level is judged on the container's usage and
 * throttling over the whole run, not on the last short polling window.
 */
export function buildRunSystemCpuMetrics(
  start: SystemMetricsSnapshot,
  end: SystemMetricsSnapshot,
): RunSystemCpuMetrics {
  const containerCpuWindow = computeRunCpuWindow(start, end);
  const { container: after } = end;
  const isCgroup = after.kind === 'cgroup';
  const runContainer = isCgroup
    ? { ...after, cpuWindow: containerCpuWindow }
    : null;
  const isContainerBasis = end.pressureBasis === 'container' && runContainer;
  const pressureLevel = isContainerBasis
    ? determineContainerPressureLevel(runContainer)
    : end.pressureLevel;
  return {
    atEnd: toRunSystemCpuSnapshot(end),
    atStart: toRunSystemCpuSnapshot(start),
    containerCpuWindow,
    platform: end.platform,
    pressureBasis: end.pressureBasis,
    pressureLevel,
    psiAvailable: end.psiAvailable,
    psiFullDeltaUs: counterDelta(start.psi.fullTotalUs, end.psi.fullTotalUs),
    psiSomeDeltaUs: counterDelta(start.psi.someTotalUs, end.psi.someTotalUs),
  };
}
