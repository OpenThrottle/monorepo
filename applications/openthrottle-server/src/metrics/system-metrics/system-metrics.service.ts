/**
 * @description Service for system-level metrics: load average, CPU pressure (PSI on Linux),
 * and count of active Ralph child processes via the worktree tracker.
 */

import { Inject, Injectable, Optional } from '@nestjs/common';
import type { IWorktreeTargetsTracker } from '@openthrottle/nestjs-worktrees';
import { WORKTREE_TRACKER_TOKEN } from '@openthrottle/nestjs-worktrees';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

import type {
  ActiveProcessesSummary,
  CgroupCpuSample,
  CgroupCpuWindow,
  CgroupMetrics,
  PsiSnapshot,
  SystemMetricsSnapshot,
} from './system-metrics.types.ts';
import {
  buildCgroupMetrics,
  captureHostMemory,
  captureLoadAverage,
  computeCgroupCpuWindow,
  createEmptyPsiSnapshot,
  determineContainerPressureLevel,
  determinePressureLevel,
  parseCgroupV2Path,
  parsePsiContent,
} from './system-metrics.utils.ts';

const PSI_CPU_PATH = '/proc/pressure/cpu';
const PROC_SELF_CGROUP_PATH = '/proc/self/cgroup';
const CGROUP_V2_ROOT = '/sys/fs/cgroup';
/**
 * @description Reads closer together than this reuse the last window instead of replacing the
 * baseline, so frequent polling cannot shrink the window to noise.
 */
const MIN_CPU_WINDOW_MS = 1000;

/**
 * @description Reads a file as UTF-8, returning null instead of throwing when it is missing or
 * unreadable.
 */
async function readTextOrNull(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

@Injectable()
export class SystemMetricsService {
  private cpuBaseline: CgroupCpuSample | null = null;
  private lastCpuWindow: CgroupCpuWindow | null = null;

  constructor(
    @Optional()
    @Inject(WORKTREE_TRACKER_TOKEN)
    private readonly worktreeTracker?: IWorktreeTargetsTracker,
  ) {}

  /**
   * @description Returns the current system metrics snapshot.
   */
  async getSystemSnapshot(): Promise<SystemMetricsSnapshot> {
    const loadAverage = captureLoadAverage();
    const [psi, container] = await Promise.all([
      this.readPsiMetrics(),
      this.readCgroupMetrics(),
    ]);
    const psiAvailable = os.platform() === 'linux' && psi.some10s !== null;
    const hasCpuLimit =
      container.kind === 'cgroup' && container.cpu.limitVcpus !== null;
    const limitedContainer = hasCpuLimit ? container : null;
    const isContainerLimited = limitedContainer !== null;
    const pressureLevel = limitedContainer
      ? determineContainerPressureLevel(limitedContainer)
      : determinePressureLevel(loadAverage, psi);
    return {
      activeProcesses: this.getActiveProcessesSummary(),
      container,
      hostMemory: captureHostMemory(),
      loadAverage,
      platform: os.platform(),
      pressureBasis: isContainerLimited ? 'container' : 'host',
      pressureLevel,
      psi,
      psiAvailable,
      timestamp: Date.now(),
    };
  }

  /**
   * @description Reads the process's own cgroup v2 limits, usage and pressure. Never throws:
   * anything that is not Linux cgroup v2 with readable files comes back `unavailable`.
   */
  async readCgroupMetrics(): Promise<CgroupMetrics> {
    if (os.platform() !== 'linux') {
      return {
        kind: 'unavailable',
        reason: `Not Linux (${os.platform()})`,
        scope: 'container',
      };
    }
    const procSelfCgroup = await readTextOrNull(PROC_SELF_CGROUP_PATH);
    if (procSelfCgroup === null) {
      return {
        kind: 'unavailable',
        reason: `${PROC_SELF_CGROUP_PATH} is unreadable`,
        scope: 'container',
      };
    }
    const cgroupPath = parseCgroupV2Path(procSelfCgroup);
    if (cgroupPath === null) {
      return {
        kind: 'unavailable',
        reason: `No cgroup v2 entry in ${PROC_SELF_CGROUP_PATH} (cgroup v1?)`,
        scope: 'container',
      };
    }
    const directory = await this.resolveCgroupDirectory(cgroupPath);
    if (directory === null) {
      return {
        kind: 'unavailable',
        reason: `cgroup v2 is not mounted at ${CGROUP_V2_ROOT}`,
        scope: 'container',
      };
    }
    const read = (file: string): Promise<string | null> => {
      return readTextOrNull(path.join(directory, file));
    };
    const [
      cpuMax,
      cpuPressure,
      cpuStat,
      memoryCurrent,
      memoryEvents,
      memoryHigh,
      memoryMax,
    ] = await Promise.all([
      read('cpu.max'),
      read('cpu.pressure'),
      read('cpu.stat'),
      read('memory.current'),
      read('memory.events'),
      read('memory.high'),
      read('memory.max'),
    ]);
    const metrics = buildCgroupMetrics(directory, {
      cpuMax,
      cpuPressure,
      cpuStat,
      memoryCurrent,
      memoryEvents,
      memoryHigh,
      memoryMax,
    });
    if (metrics.kind !== 'cgroup') {
      return metrics;
    }
    return {
      ...metrics,
      cpuWindow: this.advanceCpuWindow({ atMs: Date.now(), cpu: metrics.cpu }),
    };
  }

  /**
   * @description Computes the CPU window against the stored baseline and moves the baseline
   * forward, unless the reads are too close together (then the last window is reused).
   */
  private advanceCpuWindow(sample: CgroupCpuSample): CgroupCpuWindow | null {
    const baseline = this.cpuBaseline;
    if (baseline !== null && sample.atMs - baseline.atMs < MIN_CPU_WINDOW_MS) {
      return this.lastCpuWindow;
    }
    this.cpuBaseline = sample;
    this.lastCpuWindow =
      baseline === null ? null : computeCgroupCpuWindow(baseline, sample);
    return this.lastCpuWindow;
  }

  /**
   * @description Maps a `/proc/self/cgroup` path to its directory under the v2 mount. A
   * container without its own cgroup namespace reports the host-side path, which does not
   * exist inside it; there the mount root already is the container's cgroup, so fall back to
   * it. Null when no v2 hierarchy is mounted.
   */
  private async resolveCgroupDirectory(
    cgroupPath: string,
  ): Promise<string | null> {
    const isNamespaceRoot = cgroupPath === '/';
    const own = path.join(CGROUP_V2_ROOT, cgroupPath);
    const candidates = isNamespaceRoot
      ? [CGROUP_V2_ROOT]
      : [own, CGROUP_V2_ROOT];
    const controllers = await Promise.all(
      candidates.map((candidate) => {
        return readTextOrNull(path.join(candidate, 'cgroup.controllers'));
      }),
    );
    const index = controllers.findIndex((content) => content !== null);
    return candidates[index] ?? null;
  }

  /**
   * @description Reads /proc/pressure/cpu on Linux and returns PsiSnapshot.
   * Returns empty snapshot (all nulls) on non-Linux platforms or if file unreadable.
   */
  private async readPsiMetrics(): Promise<PsiSnapshot> {
    if (os.platform() !== 'linux') {
      return createEmptyPsiSnapshot('host');
    }
    return parsePsiContent(await readTextOrNull(PSI_CPU_PATH), 'host');
  }

  /**
   * @description Returns summary of active worktree/child processes.
   * Uses the injected worktree tracker if available.
   */
  private getActiveProcessesSummary(): ActiveProcessesSummary {
    if (!this.worktreeTracker) {
      return {
        activeWorktreeCount: 0,
        lockedWorktrees: [],
        scope: 'process',
        totalWorktreeCount: 0,
      };
    }

    const targets = this.worktreeTracker.listTargets();
    const lockedTargets = targets.filter((t) => t.status === 'locked');

    return {
      activeWorktreeCount: lockedTargets.length,
      lockedWorktrees: lockedTargets.map((t) =>
        t.status === 'locked' ? t.lockedBy : t.id,
      ),
      scope: 'process',
      totalWorktreeCount: targets.length,
    };
  }
}
