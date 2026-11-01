/**
 * @description Unit tests for the boot lifecycle this service hosts. The ordering assertion is the
 * point: the foreign-skill boot reaper clears stranded ledgers and the reconcile rebuilds the layer
 * for still-opted-in checkouts, so reconcile MUST run second — reversed, the reap would delete what
 * the reconcile had just built and every opted-in repo would boot skill-less.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { WorkspaceEditorConfigService } from '@openthrottle/nestjs-repositories';
import type { Job, Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ForeignSkillInjectionLifecycleService } from '../../services/foreign-skill-injection/foreign-skill-injection-lifecycle.service.ts';
import type { ForeignSkillMaterializationService } from '../../services/foreign-skill-injection/foreign-skill-materialization.service.ts';
import { PlanRunsStaleSweepRepeatableService } from './plan-runs-stale-sweep-repeatable.service.ts';

describe('PlanRunsStaleSweepRepeatableService.onModuleInit', () => {
  const calls: string[] = [];
  const reapStrandedLedgers = vi.fn(() => {
    calls.push('reap');
  });
  const remateralizeEnabledCheckouts = vi.fn(async () => {
    calls.push('reconcile');
    return 2;
  });
  // A full Job mock, not a bare literal: Queue['add'] is typed to return Job, and a partial
  // object type-checks at runtime but not under tsc.
  const add = vi.fn(async () => createMock<Job>({ repeatJobKey: 'key' }));
  const reconcileManifestExclusions = vi.fn(async () => {
    calls.push('editors-reconcile');
    return 1;
  });

  const build = (): PlanRunsStaleSweepRepeatableService =>
    new PlanRunsStaleSweepRepeatableService(
      createMock<Queue>({ add }),
      createMock<LoggerService>(),
      createMock<ForeignSkillInjectionLifecycleService>({
        reapStrandedLedgers,
      }),
      createMock<ForeignSkillMaterializationService>({
        remateralizeEnabledCheckouts,
      }),
      createMock<WorkspaceEditorConfigService>({
        reconcileManifestExclusions,
      }),
    );

  beforeEach(() => {
    vi.stubEnv('OT_SCHEDULED_JOBS_OWNER', '');
    vi.stubEnv('OT_WORKTREE_DB', '');
    calls.length = 0;
    reapStrandedLedgers.mockClear();
    remateralizeEnabledCheckouts.mockClear();
    reconcileManifestExclusions.mockClear();
    add.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reaps stranded layers BEFORE reconciling opted-in checkouts', async () => {
    await build().onModuleInit();

    expect(calls).toEqual(['reap', 'reconcile', 'editors-reconcile']);
  });

  it('reconciles the workspace-editors manifest exclude at boot', async () => {
    await build().onModuleInit();

    expect(reconcileManifestExclusions).toHaveBeenCalledTimes(1);
  });

  it('a failing editors reconcile does not block boot or the other steps', async () => {
    reconcileManifestExclusions.mockRejectedValueOnce(new Error('EACCES'));

    await expect(build().onModuleInit()).resolves.toBeUndefined();
    // The foreign-skill steps still ran, and the queue job still registered.
    expect(reapStrandedLedgers).toHaveBeenCalledTimes(1);
    expect(remateralizeEnabledCheckouts).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('still registers the repeatable sweep job', async () => {
    await build().onModuleInit();

    expect(add).toHaveBeenCalledTimes(1);
  });

  it('boots even when the reconcile throws — an unreachable repo must not block startup', async () => {
    remateralizeEnabledCheckouts.mockRejectedValueOnce(
      new Error('ENOENT: the repo moved'),
    );

    await expect(build().onModuleInit()).resolves.toBeUndefined();
    expect(add).toHaveBeenCalledTimes(1);
  });

  describe('as a shared-DB worktree (non-owner)', () => {
    beforeEach(() => {
      vi.stubEnv('OT_WORKTREE_DB', 'shared');
    });

    it('registers no repeatable sweep job', async () => {
      await build().onModuleInit();

      expect(add).not.toHaveBeenCalled();
    });

    it('still runs the per-process boot reap and reconcile (only the registration is gated)', async () => {
      await build().onModuleInit();

      expect(calls).toEqual(['reap', 'reconcile', 'editors-reconcile']);
    });
  });

  it('registers the sweep on an isolated worktree (owns its own database)', async () => {
    vi.stubEnv('OT_WORKTREE_DB', 'isolated');

    await build().onModuleInit();

    expect(add).toHaveBeenCalledTimes(1);
  });
});
