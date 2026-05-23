/**
 * @description System-level CPU pressure metrics collection.
 * Reads Linux PSI from /proc/pressure/cpu and captures os.loadavg() at job start/end.
 * On macOS/Windows, PSI metrics are unavailable (null) but loadavg is captured.
 */

import { promises as fs } from 'fs';
import * as os from 'os';
import type {
  PsiCpuMetrics,
  SystemCpuMetrics,
  SystemCpuSnapshot,
} from '../types/system-cpu-metrics';
import {
  captureLoadAverage,
  createEmptyPsiMetrics,
  determinePressureLevel,
} from '../types/system-cpu-metrics';

/** Path to Linux PSI CPU file. */
const PSI_CPU_PATH = '/proc/pressure/cpu';

/**
 * @description Parses a PSI line like "some avg10=0.00 avg60=0.00 avg300=0.00 total=0"
 * Returns { avg10, avg60, avg300, total } or null if parse fails.
 */
function parsePsiLine(
  line: string,
): { avg10: number; avg300: number; avg60: number; total: number } | null {
  const match = line.match(
    /avg10=([\d.]+)\s+avg60=([\d.]+)\s+avg300=([\d.]+)\s+total=(\d+)/,
  );
  if (!match) return null;

  return {
    avg10: parseFloat(match[1]),
    avg300: parseFloat(match[3]),
    avg60: parseFloat(match[2]),
    total: parseInt(match[4], 10),
  };
}

/**
 * @description Reads /proc/pressure/cpu on Linux and returns PsiCpuMetrics.
 * Returns empty metrics (all nulls) on non-Linux platforms or if file unreadable.
 */
export async function readPsiCpuMetrics(): Promise<PsiCpuMetrics> {
  if (os.platform() !== 'linux') {
    return createEmptyPsiMetrics();
  }

  try {
    const content = await fs.readFile(PSI_CPU_PATH, 'utf8');
    const lines = content.trim().split('\n');

    let someMetrics: ReturnType<typeof parsePsiLine> = null;
    let fullMetrics: ReturnType<typeof parsePsiLine> = null;

    for (const line of lines) {
      if (line.startsWith('some ')) {
        someMetrics = parsePsiLine(line);
      } else if (line.startsWith('full ')) {
        fullMetrics = parsePsiLine(line);
      }
    }

    return {
      full10s: fullMetrics?.avg10 ?? null,
      full300s: fullMetrics?.avg300 ?? null,
      full60s: fullMetrics?.avg60 ?? null,
      fullTotalUs: fullMetrics?.total ?? null,
      some10s: someMetrics?.avg10 ?? null,
      some300s: someMetrics?.avg300 ?? null,
      some60s: someMetrics?.avg60 ?? null,
      someTotalUs: someMetrics?.total ?? null,
    };
  } catch {
    return createEmptyPsiMetrics();
  }
}

/**
 * @description Captures a complete system CPU snapshot (loadavg + PSI).
 */
export async function captureSystemCpuSnapshot(): Promise<SystemCpuSnapshot> {
  const loadAverage = captureLoadAverage();
  const psi = await readPsiCpuMetrics();

  return {
    loadAverage,
    psi,
    timestamp: Date.now(),
  };
}

/**
 * @description Creates a SystemCpuMetrics object from start and end snapshots.
 */
export function createSystemCpuMetrics(
  atStart: SystemCpuSnapshot,
  atEnd: SystemCpuSnapshot,
): SystemCpuMetrics {
  const platform = os.platform();
  const psiAvailable = platform === 'linux' && atEnd.psi.someTotalUs !== null;

  let psiSomeDeltaUs: number | null = null;
  let psiFullDeltaUs: number | null = null;

  if (atStart.psi.someTotalUs !== null && atEnd.psi.someTotalUs !== null) {
    psiSomeDeltaUs = atEnd.psi.someTotalUs - atStart.psi.someTotalUs;
  }

  if (atStart.psi.fullTotalUs !== null && atEnd.psi.fullTotalUs !== null) {
    psiFullDeltaUs = atEnd.psi.fullTotalUs - atStart.psi.fullTotalUs;
  }

  const pressureLevel = determinePressureLevel(atEnd.loadAverage, atEnd.psi);

  return {
    atEnd,
    atStart,
    platform,
    pressureLevel,
    psiAvailable,
    psiFullDeltaUs,
    psiSomeDeltaUs,
  };
}

/**
 * @description Collector that captures system CPU metrics at start and stop.
 * Similar pattern to ChildProcessMetricsCollector for consistency.
 */
export interface SystemCpuMetricsCollector {
  /** Start capturing (call at job start). Returns the start snapshot. */
  start(): Promise<SystemCpuSnapshot>;
  /** Whether the collector has been started. */
  readonly started: boolean;
  /** Stop capturing and return complete metrics (call at job end). */
  stop(): Promise<SystemCpuMetrics>;
  /** Whether the collector has been stopped. */
  readonly stopped: boolean;
}

/**
 * @description Creates a new system CPU metrics collector.
 * Call start() at job begin, stop() at job end to get SystemCpuMetrics.
 */
export function createSystemCpuMetricsCollector(): SystemCpuMetricsCollector {
  let startSnapshot: SystemCpuSnapshot | null = null;
  let stopped = false;

  const start = async (): Promise<SystemCpuSnapshot> => {
    if (startSnapshot !== null) {
      return startSnapshot;
    }
    startSnapshot = await captureSystemCpuSnapshot();
    return startSnapshot;
  };

  const stop = async (): Promise<SystemCpuMetrics> => {
    if (startSnapshot === null) {
      startSnapshot = await captureSystemCpuSnapshot();
    }
    const endSnapshot = await captureSystemCpuSnapshot();
    stopped = true;
    return createSystemCpuMetrics(startSnapshot, endSnapshot);
  };

  return {
    start,
    get started(): boolean {
      return startSnapshot !== null;
    },
    stop,
    get stopped(): boolean {
      return stopped;
    },
  };
}

/**
 * @description One-shot helper: captures a single system CPU snapshot.
 * Useful for quick checks or tests.
 */
export async function sampleSystemCpu(): Promise<SystemCpuSnapshot> {
  return captureSystemCpuSnapshot();
}

/**
 * @description Checks if PSI metrics are available on this system.
 * Returns true only on Linux with cgroup v2 (PSI file exists and readable).
 */
export async function isPsiAvailable(): Promise<boolean> {
  if (os.platform() !== 'linux') {
    return false;
  }

  try {
    await fs.access(PSI_CPU_PATH);
    return true;
  } catch {
    return false;
  }
}
