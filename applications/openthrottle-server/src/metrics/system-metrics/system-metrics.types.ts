/**
 * @description Types for the /metrics/system endpoint.
 * Provides system-level metrics for live profiling: load average, CPU pressure (Linux PSI),
 * and count of active plan-run child processes.
 */

/**
 * @description What a metric group measures. `host` is the whole machine (or VM) — under
 * Docker without lxcfs, load average, `os.totalmem()` and `/proc/pressure/cpu` are all host-wide.
 * `container` is the server's own cgroup: its limits, usage and throttling. `process` is the
 * server process and the child runs it tracks.
 */
export type MetricScope = 'container' | 'host' | 'process';

/**
 * @description System load average from os.loadavg().
 * Represents average number of processes in the run queue over 1, 5, and 15 minutes.
 */
export interface LoadAverageSnapshot {
  readonly cpuCount: number;
  readonly load15m: number;
  readonly load1m: number;
  readonly load5m: number;
  readonly perCoreLoad1m: number;
  readonly scope: 'host';
}

/**
 * @description Linux Pressure Stall Information (PSI) for CPU.
 * From /proc/pressure/cpu: shows percentage of time tasks were stalled on CPU.
 * Null values indicate PSI is unavailable (non-Linux or cgroup v1).
 */
export interface PsiSnapshot {
  readonly full10s: number | null;
  readonly full300s: number | null;
  readonly full60s: number | null;
  /** @description Cumulative full stall time in microseconds (the `total=` field). */
  readonly fullTotalUs: number | null;
  readonly scope: 'container' | 'host';
  readonly some10s: number | null;
  readonly some300s: number | null;
  readonly some60s: number | null;
  /** @description Cumulative some stall time in microseconds (the `total=` field). */
  readonly someTotalUs: number | null;
}

/**
 * @description Active worktree/child process summary.
 */
export interface ActiveProcessesSummary {
  readonly activeWorktreeCount: number;
  readonly lockedWorktrees: readonly string[];
  readonly scope: 'process';
  readonly totalWorktreeCount: number;
}

/**
 * @description Host memory from os.totalmem()/os.freemem(). Inside a container this is the
 * host's (or VM's) memory, not the container's limit — see CgroupMemoryMetrics for that.
 */
export interface HostMemorySnapshot {
  readonly freeBytes: number;
  readonly scope: 'host';
  readonly totalBytes: number;
  /** @description (total - free) / total, rounded to 2 places. */
  readonly usedRatio: number;
}

/**
 * @description Interpretation of system CPU pressure.
 */
export type PressureLevel = 'low' | 'moderate' | 'high' | 'unknown';

/**
 * @description Complete system metrics snapshot for the /metrics/system endpoint.
 */
export interface SystemMetricsSnapshot {
  readonly activeProcesses: ActiveProcessesSummary;
  /** @description The server's own cgroup limits, usage and throttling, or why there is none. */
  readonly container: CgroupMetrics;
  readonly hostMemory: HostMemorySnapshot;
  readonly loadAverage: LoadAverageSnapshot;
  readonly platform: NodeJS.Platform;
  /**
   * @description `container` when the server has a cgroup CPU limit (pressure is then usage and
   * throttling against that limit), otherwise `host` (load average and PSI).
   */
  readonly pressureBasis: 'container' | 'host';
  readonly pressureLevel: PressureLevel;
  readonly psi: PsiSnapshot;
  readonly psiAvailable: boolean;
  readonly timestamp: number;
}

/**
 * @description The server's own cgroup v2 CPU accounting, from `cpu.max` and `cpu.stat`.
 * The stat counters are cumulative since the cgroup was created.
 */
export interface CgroupCpuMetrics {
  /** @description vCPUs allowed by `cpu.max` (quota / period). Null when unlimited (`max` or no file). */
  readonly limitVcpus: number | null;
  readonly nrPeriods: number | null;
  readonly nrThrottled: number | null;
  readonly throttledUsec: number | null;
  readonly usageUsec: number | null;
}

/**
 * @description One cgroup CPU read and when it was taken.
 */
export interface CgroupCpuSample {
  readonly atMs: number;
  readonly cpu: CgroupCpuMetrics;
}

/**
 * @description CPU usage and throttling between two cgroup reads, so the numbers describe
 * recent behaviour rather than totals since the container started.
 */
export interface CgroupCpuWindow {
  readonly elapsedMs: number;
  /** @description Share of CFS periods in the window that were throttled, 0–1. */
  readonly throttledPeriodRatio: number | null;
  /** @description CPU used in the window as a share of the `cpu.max` limit, 0–1+. */
  readonly usageRatioOfLimit: number | null;
  /** @description Average vCPUs used over the window. */
  readonly usedVcpus: number | null;
}

/**
 * @description Counters from the cgroup's `memory.events`, cumulative since creation.
 */
export interface CgroupMemoryEvents {
  readonly high: number;
  readonly max: number;
  readonly oom: number;
  readonly oomKill: number;
}

/**
 * @description The server's own cgroup v2 memory limit and usage.
 */
export interface CgroupMemoryMetrics {
  readonly currentBytes: number | null;
  /** @description Null when `memory.events` is unreadable. */
  readonly events: CgroupMemoryEvents | null;
  /** @description `memory.high` throttle threshold in bytes. Null when unlimited (`max` or no file). */
  readonly highBytes: number | null;
  /** @description `memory.max` hard limit in bytes. Null when unlimited (`max` or no file). */
  readonly limitBytes: number | null;
}

/**
 * @description The process's own cgroup v2 was found and read.
 */
export interface CgroupMetricsAvailable {
  readonly cpu: CgroupCpuMetrics;
  /**
   * @description Usage and throttling since the previous read. Null on the first read, or when
   * cpu.stat lacks the counters.
   */
  readonly cpuWindow: CgroupCpuWindow | null;
  readonly kind: 'cgroup';
  readonly memory: CgroupMemoryMetrics;
  /** @description Absolute path of the cgroup directory that was read. */
  readonly path: string;
  /** @description The cgroup's own CPU pressure (`cpu.pressure`), not the host's. */
  readonly psi: PsiSnapshot;
  readonly scope: 'container';
}

/**
 * @description No readable cgroup v2 for this process (macOS, cgroup v1, unreadable files).
 */
export interface CgroupMetricsUnavailable {
  readonly kind: 'unavailable';
  readonly reason: string;
  readonly scope: 'container';
}

/**
 * @description The process's own cgroup v2 limits and usage, or why they could not be read.
 */
export type CgroupMetrics = CgroupMetricsAvailable | CgroupMetricsUnavailable;

/**
 * @description Raw contents of the cgroup v2 files the reader looks at. Null means the file
 * was missing or unreadable.
 */
export interface CgroupFileContents {
  readonly cpuMax: string | null;
  readonly cpuPressure: string | null;
  readonly cpuStat: string | null;
  readonly memoryCurrent: string | null;
  readonly memoryEvents: string | null;
  readonly memoryHigh: string | null;
  readonly memoryMax: string | null;
}

/**
 * @description One point-in-time system reading kept on a plan run's metrics. A superset of the
 * workflow package's SystemCpuSnapshot: it adds the server's own cgroup.
 */
export interface RunSystemCpuSnapshot {
  readonly container: CgroupMetrics;
  readonly loadAverage: LoadAverageSnapshot;
  readonly psi: PsiSnapshot;
  readonly timestamp: number;
}

/**
 * @description System CPU metrics for one plan run, from a reading at its start and end. A
 * superset of the workflow package's SystemCpuMetrics: it adds the container's usage and
 * throttling over the whole run, and which scope the pressure level was judged on.
 */
export interface RunSystemCpuMetrics {
  readonly atEnd: RunSystemCpuSnapshot;
  readonly atStart: RunSystemCpuSnapshot;
  /** @description Container CPU usage and throttling between atStart and atEnd. */
  readonly containerCpuWindow: CgroupCpuWindow | null;
  readonly platform: NodeJS.Platform;
  readonly pressureBasis: 'container' | 'host';
  readonly pressureLevel: PressureLevel;
  readonly psiAvailable: boolean;
  readonly psiFullDeltaUs: number | null;
  readonly psiSomeDeltaUs: number | null;
}
