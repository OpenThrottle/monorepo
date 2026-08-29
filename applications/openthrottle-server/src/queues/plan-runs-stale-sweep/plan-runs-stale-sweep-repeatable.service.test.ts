/**
 * @description Unit tests for the boot lifecycle this service hosts. The ordering assertion is the
 * point: the foreign-skill boot reaper clears stranded ledgers and the reconcile rebuilds the layer
 * for still-opted-in checkouts, so reconcile MUST run second — reversed, the reap would delete what
 * the reconcile had just built and every opted-in repo would boot skill-less.
 */

import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Job, Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkspaceEditorConfigService } from '@openthrottle/nestjs-repositories';

import { ForeignSkillInjectionLifecycleService } from '../../services/foreign-skill-injection/foreign-skill-injection-lifecycle.service';
import { ForeignSkillMaterializationService } from '../../services/foreign-skill-injection/foreign-skill-materialization.service';
import { PlanRunsStaleSweepRepeatableService } from './plan-runs-stale-sweep-repeatable.service';

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
    calls.length = 0;
    reapStrandedLedgers.mockClear();
    remateralizeEnabledCheckouts.mockClear();
    reconcileManifestExclusions.mockClear();
    add.mockClear();
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
});
