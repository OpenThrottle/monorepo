import { describe, expect, test } from 'vitest';

import { buildPlanRunConfigSnapshot } from '../plan-run-config-snapshot.build.ts';
import { PLAN_RUN_CONFIG_SNAPSHOT_VERSION } from '../plan-run-config-snapshot.constants.ts';
import { parsePlanRunConfigSnapshot } from '../plan-run-config-snapshot.validation.ts';

describe('buildPlanRunConfigSnapshot', () => {
  test('defaults a plan run to plan target and empty workspace', () => {
    const snapshot = buildPlanRunConfigSnapshot({
      driver: 'cursor',
      mode: 'plan',
    });

    expect(snapshot).toEqual({
      run: { driver: 'cursor' },
      target: { mode: 'plan', taskId: '' },
      version: PLAN_RUN_CONFIG_SNAPSHOT_VERSION,
      workspace: { workingDirectory: '' },
    });
  });

  test('captures resolved tuning, workspace, hooks, and task target', () => {
    const snapshot = buildPlanRunConfigSnapshot({
      driver: 'claude',
      jobRunHooks: {
        hooks: [{ command: 'echo hi', event: 'beforeRun' }],
      },
      mode: 'task',
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
      tuning: {
        debug: 'verbose',
        iterationTimeoutSeconds: 90,
        worktreeName: 'plan-abc12345',
      },
      workingDirectory: '/tmp/openthrottle',
    });

    expect(snapshot).toEqual({
      jobRunHooks: {
        hooks: [{ command: 'echo hi', event: 'beforeRun' }],
      },
      run: {
        debug: 'verbose',
        driver: 'claude',
        iterationTimeoutSeconds: 90,
        worktreeName: 'plan-abc12345',
      },
      target: {
        mode: 'task',
        taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
      },
      version: PLAN_RUN_CONFIG_SNAPSHOT_VERSION,
      workspace: { workingDirectory: '/tmp/openthrottle' },
    });
  });

  test('captures effort and round-trips it through parsePlanRunConfigSnapshot', () => {
    const built = buildPlanRunConfigSnapshot({
      driver: 'claude',
      tuning: { effort: 'ultra' },
    });

    expect(built.run.effort).toBe('ultra');
    expect(parsePlanRunConfigSnapshot(built)).toEqual(built);
  });

  test('omits effort when unset or blank', () => {
    const built = buildPlanRunConfigSnapshot({
      driver: 'cursor',
      tuning: { effort: '  ' },
    });

    expect(built.run).not.toHaveProperty('effort');
  });

  test('round-trips through parsePlanRunConfigSnapshot', () => {
    const built = buildPlanRunConfigSnapshot({
      driver: 'cursor',
      tuning: { model: 'auto' },
      workingDirectory: '/workspace/repo',
    });

    expect(parsePlanRunConfigSnapshot(built)).toEqual(built);
  });

  test('folds the OT Loop validation fields into the run block', () => {
    const built = buildPlanRunConfigSnapshot({
      driver: 'claude',
      otLoop: { maxRetries: 2, validationCommands: ['pnpm nx run x:test'] },
    });

    expect(built.run).toEqual({
      driver: 'claude',
      maxRetries: 2,
      validationCommands: ['pnpm nx run x:test'],
    });
    expect(parsePlanRunConfigSnapshot(built)).toEqual(built);
  });

  test('rejects unknown top-level keys', () => {
    const built = buildPlanRunConfigSnapshot({ driver: 'cursor' });

    expect(() =>
      parsePlanRunConfigSnapshot({ ...built, retiredRun: built.run }),
    ).toThrow();
    expect(() =>
      parsePlanRunConfigSnapshot({ ...built, otLoop: {} }),
    ).toThrow();
    expect(() =>
      parsePlanRunConfigSnapshot({ ...built, runner: 'ot-loop' }),
    ).toThrow();
  });
});
