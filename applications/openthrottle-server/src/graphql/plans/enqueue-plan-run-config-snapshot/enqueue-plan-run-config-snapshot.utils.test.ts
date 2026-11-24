import { tmpdir } from 'node:os';

import { describe, expect, test } from 'vitest';

import { buildRunPlanOrchestratorJobData } from '../enqueue-plan-run-tuning/enqueue-plan-run-tuning.utils.ts';
import {
  buildPlanRunConfigSnapshotFromJobData,
  orchestratorJobInputFromSnapshot,
} from './enqueue-plan-run-config-snapshot.utils.ts';

describe('buildPlanRunConfigSnapshotFromJobData', () => {
  test('maps orchestrator job data to plan-target snapshot', () => {
    const snapshot = buildPlanRunConfigSnapshotFromJobData({
      driver: 'cursor',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      runKind: 'orchestrator',
      tuning: { model: 'm-1' },
      workingDirectory: '/tmp/repo',
    });

    expect(snapshot.target).toEqual({ mode: 'plan', taskId: '' });
    expect(snapshot.workspace.workingDirectory).toBe('/tmp/repo');
    expect(snapshot.run).toEqual({
      driver: 'cursor',
      model: 'm-1',
    });
  });

  test('maps orchestrator task mode snapshot', () => {
    const snapshot = buildPlanRunConfigSnapshotFromJobData({
      driver: 'claude',
      mode: 'task',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      runKind: 'orchestrator',
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
    });

    expect(snapshot.target).toEqual({
      mode: 'task',
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
    });
    expect(snapshot.run.driver).toBe('claude');
  });

  test('carries run.effort on the snapshot (plan and task runs)', () => {
    const plan = buildPlanRunConfigSnapshotFromJobData({
      driver: 'cursor',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      runKind: 'orchestrator',
      tuning: { effort: 'max' },
    });
    expect(plan.run.effort).toBe('max');

    const task = buildPlanRunConfigSnapshotFromJobData({
      driver: 'cursor',
      mode: 'task',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      runKind: 'orchestrator',
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
      tuning: { effort: 'low' },
    });
    expect(task.run.effort).toBe('low');
  });

  test('folds otLoop into the snapshot run block and omits it when unset', () => {
    const otLoop = { validationCommands: ['pnpm nx run x:test'] };
    const snapshot = buildPlanRunConfigSnapshotFromJobData({
      driver: 'cursor',
      otLoop,
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      runKind: 'orchestrator',
    });
    expect(snapshot.run.validationCommands).toEqual(otLoop.validationCommands);
    expect(snapshot).not.toHaveProperty('otLoop');
    expect(snapshot).not.toHaveProperty('runner');

    const plain = buildPlanRunConfigSnapshotFromJobData({
      driver: 'cursor',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      runKind: 'orchestrator',
    });
    expect(plain.run).not.toHaveProperty('validationCommands');
  });

  test('omits effort from the snapshot when unset', () => {
    const snapshot = buildPlanRunConfigSnapshotFromJobData({
      driver: 'cursor',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      runKind: 'orchestrator',
      tuning: { model: 'm-1' },
    });
    expect(snapshot.run).not.toHaveProperty('effort');
  });
});

describe('orchestratorJobInputFromSnapshot', () => {
  const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

  /** Enqueue-time job data -> snapshot -> rebuilt job data must be the same payload. */
  const roundTrip = (
    input: Parameters<typeof buildRunPlanOrchestratorJobData>[0],
  ): {
    readonly original: ReturnType<typeof buildRunPlanOrchestratorJobData>;
    readonly rebuilt: ReturnType<typeof buildRunPlanOrchestratorJobData>;
  } => {
    const original = buildRunPlanOrchestratorJobData(input);
    const snapshot = buildPlanRunConfigSnapshotFromJobData(original);

    return {
      original,
      rebuilt: buildRunPlanOrchestratorJobData(
        orchestratorJobInputFromSnapshot(planId, snapshot),
      ),
    };
  };

  test('rebuilds the exact payload of a scheduled (plan-mode) run with defaults applied', () => {
    const { original, rebuilt } = roundTrip({
      mode: null,
      planId,
      taskId: null,
      tuning: { driver: 'claude', effort: 'high', model: 'm-1' },
      workingDirectory: tmpdir(),
    });

    expect(rebuilt).toEqual(original);
  });

  test('keeps an explicit debug opt-out instead of re-applying the verbose default', () => {
    const { original, rebuilt } = roundTrip({
      mode: null,
      planId,
      taskId: null,
      tuning: { debugCli: 'omit' },
      workingDirectory: null,
    });

    expect(original.tuning?.debug).toBe('omit');
    expect(rebuilt).toEqual(original);
  });

  test('carries the merged lifecycle hooks once (no double merge)', () => {
    const { original, rebuilt } = roundTrip({
      jobRunHooksJson: JSON.stringify({
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'beforeAll',
            prompt: '/agents/plan-run',
            promptDelivery: 'named',
          },
        ],
      }),
      mode: null,
      planId,
      taskId: null,
      tuning: null,
      workingDirectory: null,
    });

    expect(original.jobRunHooks?.hooks).toHaveLength(1);
    expect(rebuilt).toEqual(original);
  });

  test('rebuilds a task-mode run', () => {
    const { original, rebuilt } = roundTrip({
      mode: 'task',
      planId,
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
      tuning: null,
      workingDirectory: null,
    });

    expect(rebuilt).toEqual(original);
  });

  test('carries otLoop through snapshot and back', () => {
    const otLoop = {
      finalValidationCommands: ['pnpm run check:local'],
      maxRetries: 3,
      setupCommands: ['pnpm nx run-many --target=codegen-graphql --all'],
      validationCommands: ['pnpm nx affected --target=lint'],
    };
    const { original, rebuilt } = roundTrip({
      mode: null,
      otLoop,
      planId,
      taskId: null,
      workingDirectory: null,
    });

    expect(original.otLoop).toEqual(otLoop);
    expect(rebuilt).toEqual(original);
    expect(rebuilt.otLoop).toEqual(otLoop);
  });

  test('carries otLoop for a task-mode run', () => {
    const { original, rebuilt } = roundTrip({
      mode: 'task',
      otLoop: { maxRetries: 0 },
      planId,
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
      workingDirectory: null,
    });

    expect(rebuilt).toEqual(original);
    expect(rebuilt.otLoop).toEqual({ maxRetries: 0 });
  });

  test('an absent otLoop stays absent', () => {
    const absent = roundTrip({ planId });
    expect(absent.original).not.toHaveProperty('otLoop');
    expect(absent.rebuilt).not.toHaveProperty('otLoop');
  });
});
