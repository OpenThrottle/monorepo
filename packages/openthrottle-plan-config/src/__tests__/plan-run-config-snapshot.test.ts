import { describe, expect, test } from 'vitest';

import { buildPlanRunConfigSnapshot } from '../plan-run-config-snapshot.build.ts';
import { PLAN_RUN_CONFIG_SNAPSHOT_VERSION } from '../plan-run-config-snapshot.constants.ts';
import { parsePlanRunConfigSnapshot } from '../plan-run-config-snapshot.validation.ts';

describe('buildPlanRunConfigSnapshot', () => {
  test('defaults spawn plan run to plan target and empty workspace', () => {
    const snapshot = buildPlanRunConfigSnapshot({
      executionBackend: 'cursor',
      mode: 'plan',
    });

    expect(snapshot).toEqual({
      ralph: { executionBackend: 'cursor' },
      target: { mode: 'plan', taskId: '' },
      version: PLAN_RUN_CONFIG_SNAPSHOT_VERSION,
      workspace: { workingDirectory: '' },
    });
  });

  test('captures resolved tuning, workspace, hooks, and task target', () => {
    const snapshot = buildPlanRunConfigSnapshot({
      executionBackend: 'claude',
      jobRunHooks: {
        hooks: [{ command: 'echo hi', event: 'beforeRun' }],
      },
      mode: 'task',
      ralph: {
        debug: 'verbose',
        iterationTimeoutSeconds: 90,
        iterations: 3,
        project: 'applications/openthrottle-server',
      },
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
      workingDirectory: '/tmp/openthrottle',
    });

    expect(snapshot).toEqual({
      jobRunHooks: {
        hooks: [{ command: 'echo hi', event: 'beforeRun' }],
      },
      ralph: {
        debug: 'verbose',
        executionBackend: 'claude',
        iterationTimeoutSeconds: 90,
        iterations: 3,
        project: 'applications/openthrottle-server',
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
      executionBackend: 'claude',
      ralph: { effort: 'ultra' },
    });

    expect(built.ralph.effort).toBe('ultra');
    expect(parsePlanRunConfigSnapshot(built)).toEqual(built);
  });

  test('omits effort when unset or blank', () => {
    const built = buildPlanRunConfigSnapshot({
      executionBackend: 'cursor',
      ralph: { effort: '  ' },
    });

    expect(built.ralph).not.toHaveProperty('effort');
  });

  test('round-trips through parsePlanRunConfigSnapshot', () => {
    const built = buildPlanRunConfigSnapshot({
      executionBackend: 'cursor',
      ralph: { iterations: 5 },
      workingDirectory: '/workspace/repo',
    });

    expect(parsePlanRunConfigSnapshot(built)).toEqual(built);
  });

  test('carries runner and otLoop and round-trips them through the schema', () => {
    const built = buildPlanRunConfigSnapshot({
      executionBackend: 'claude',
      otLoop: { maxRetries: 2, validationCommands: ['pnpm nx run x:test'] },
      runner: 'ot-loop',
    });

    expect(built.runner).toBe('ot-loop');
    expect(built.otLoop).toEqual({
      maxRetries: 2,
      validationCommands: ['pnpm nx run x:test'],
    });
    expect(parsePlanRunConfigSnapshot(built)).toEqual(built);
  });

  test('omits runner and otLoop when unset and rejects a bad runner', () => {
    const built = buildPlanRunConfigSnapshot({ executionBackend: 'cursor' });

    expect(built).not.toHaveProperty('runner');
    expect(built).not.toHaveProperty('otLoop');
    expect(() =>
      parsePlanRunConfigSnapshot({ ...built, runner: 'other' }),
    ).toThrow();
  });
});
