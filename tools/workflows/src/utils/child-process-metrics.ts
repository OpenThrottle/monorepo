/**
 * @description Child process CPU/memory polling using pidusage.
 * Captures peak and average CPU/RSS while a spawned process runs.
 */

import pidusage from 'pidusage';
import type {
  ChildProcessMetrics,
  ChildProcessMetricsOptions,
  ChildProcessSample,
} from '../types/child-process-metrics';
import { DEFAULT_POLL_INTERVAL_MS } from '../types/child-process-metrics';

const BYTES_PER_MB = 1024 * 1024;

interface ChildProcessMetricsCollectorState {
  intervalId: ReturnType<typeof setInterval> | null;
  readonly keepSamples: boolean;
  metricsReturned: boolean;
  pid: number;
  readonly pollIntervalMs: number;
  samples: ChildProcessSample[];
  startTime: number;
  stopped: boolean;
}

/**
 * @description Creates a collector that polls a child process at intervals.
 * Call start() with a PID after spawn, then stop() when the process exits.
 * Returns aggregated ChildProcessMetrics.
 */
export interface ChildProcessMetricsCollector {
  /** Start polling the given PID. Call once after spawn. */
  start(pid: number): void;
  /** Stop polling and return aggregated metrics. Safe to call multiple times. */
  stop(): ChildProcessMetrics | null;
  /** Whether the collector has been stopped. */
  readonly stopped: boolean;
}

/**
 * @description Creates a new child process metrics collector.
 * The collector polls the child process at the given interval and aggregates CPU/RSS metrics.
 */
export function createChildProcessMetricsCollector(
  options: ChildProcessMetricsOptions = {},
): ChildProcessMetricsCollector {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const keepSamples = options.keepSamples ?? false;

  const state: ChildProcessMetricsCollectorState = {
    intervalId: null,
    keepSamples,
    metricsReturned: false,
    pid: 0,
    pollIntervalMs,
    samples: [],
    startTime: 0,
    stopped: false,
  };

  const takeSample = async (): Promise<void> => {
    if (state.stopped || state.pid === 0) return;

    try {
      const stats = await pidusage(state.pid);
      const sample: ChildProcessSample = {
        cpu: stats.cpu,
        elapsedMs: Date.now() - state.startTime,
        rssMb: stats.memory / BYTES_PER_MB,
        timestamp: Date.now(),
      };
      state.samples.push(sample);
    } catch {
      // Process may have exited; ignore and let stop() finalize
    }
  };

  const start = (pid: number): void => {
    if (state.stopped) return;
    state.pid = pid;
    state.startTime = Date.now();

    takeSample();

    state.intervalId = setInterval(() => {
      takeSample();
    }, pollIntervalMs);
  };

  const stop = (): ChildProcessMetrics | null => {
    if (state.intervalId !== null) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    state.stopped = true;

    if (
      state.metricsReturned ||
      state.pid === 0 ||
      state.samples.length === 0
    ) {
      return null;
    }

    const { samples, pid } = state;
    const cpuValues = samples.map((s) => s.cpu);
    const rssValues = samples.map((s) => s.rssMb);

    const peakCpuPercent = Math.max(...cpuValues);
    const avgCpuPercent =
      cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length;
    const peakRssMb = Math.max(...rssValues);
    const avgRssMb =
      rssValues.reduce((sum, v) => sum + v, 0) / rssValues.length;

    const result: ChildProcessMetrics = {
      avgCpuPercent: Math.round(avgCpuPercent * 100) / 100,
      avgRssMb: Math.round(avgRssMb * 100) / 100,
      peakCpuPercent: Math.round(peakCpuPercent * 100) / 100,
      peakRssMb: Math.round(peakRssMb * 100) / 100,
      pid,
      pollIntervalMs: state.pollIntervalMs,
      sampleCount: samples.length,
      samples: keepSamples ? samples : undefined,
    };

    state.metricsReturned = true;

    return result;
  };

  return {
    start,
    stop,
    get stopped(): boolean {
      return state.stopped;
    },
  };
}

/**
 * @description One-shot helper: polls a PID once and returns a single sample.
 * Useful for quick profiling or tests.
 */
export async function sampleChildProcess(
  pid: number,
): Promise<ChildProcessSample | null> {
  try {
    const stats = await pidusage(pid);
    return {
      cpu: stats.cpu,
      elapsedMs: 0,
      rssMb: stats.memory / BYTES_PER_MB,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}
