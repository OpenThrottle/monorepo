/**
 * @description Service for system-level metrics: load average, CPU pressure (PSI on Linux),
 * and count of active Ralph child processes via the worktree tracker.
 */

import { promises as fs } from 'fs';
import * as os from 'os';
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { IWorktreeTargetsTracker } from '@openthrottle/nestjs-worktrees';
import { WORKTREE_TRACKER_TOKEN } from '@openthrottle/nestjs-worktrees';
import type {
  ActiveProcessesSummary,
  PsiSnapshot,
  SystemMetricsSnapshot,
} from './system-metrics.types';
import {
  captureLoadAverage,
  createEmptyPsiSnapshot,
  determinePressureLevel,
} from './system-metrics.types';

const PSI_CPU_PATH = '/proc/pressure/cpu';

/**
 * @description Parses a PSI line like "some avg10=0.00 avg60=0.00 avg300=0.00 total=0"
 */
function parsePsiLine(
  line: string,
): { avg10: number; avg60: number; avg300: number } | null {
  const match = line.match(/avg10=([\d.]+)\s+avg60=([\d.]+)\s+avg300=([\d.]+)/);
  if (!match) return null;

  return {
    avg10: parseFloat(match[1]),
    avg300: parseFloat(match[3]),
    avg60: parseFloat(match[2]),
  };
}

@Injectable()
export class SystemMetricsService {
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
    const psi = await this.readPsiMetrics();
    const psiAvailable = os.platform() === 'linux' && psi.some10s !== null;
    const pressureLevel = determinePressureLevel(loadAverage, psi);
    const activeProcesses = this.getActiveProcessesSummary();

    return {
      activeProcesses,
      loadAverage,
      platform: os.platform(),
      pressureLevel,
      psi,
      psiAvailable,
      timestamp: Date.now(),
    };
  }

  /**
   * @description Reads /proc/pressure/cpu on Linux and returns PsiSnapshot.
   * Returns empty snapshot (all nulls) on non-Linux platforms or if file unreadable.
   */
  private async readPsiMetrics(): Promise<PsiSnapshot> {
    if (os.platform() !== 'linux') {
      return createEmptyPsiSnapshot();
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
        some10s: someMetrics?.avg10 ?? null,
        some300s: someMetrics?.avg300 ?? null,
        some60s: someMetrics?.avg60 ?? null,
      };
    } catch {
      return createEmptyPsiSnapshot();
    }
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
      totalWorktreeCount: targets.length,
    };
  }
}
