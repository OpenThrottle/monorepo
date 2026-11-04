import { tmpdir } from 'node:os';

import { describe, expect, test } from 'vitest';

import { buildRunPlanOrchestratorJobData } from './enqueue-plan-ralph-tuning.ts';
import {
  buildPlanRunConfigSnapshotFromJobData,
  orchestratorJobInputFromSnapshot,
} from './enqueue-plan-run-config-snapshot.ts';

describe('buildPlanRunConfigSnapshotFromJobData', () => {
  test('maps orchestrator job data to plan-target snapshot', () => {
    const snapshot = buildPlanRunConfigSnapshotFromJobData({
      executionBackend: 'cursor',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      ralph: { iterations: 5 },
      runKind: 'orchestrator',
      workingDirectory: '/tmp/repo',
    });

    expect(snapshot.target).toEqual({ mode: 'plan', taskId: '' });
    expect(snapshot.workspace.workingDirectory).toBe('/tmp/repo');
    expect(snapshot.ralph).toEqual({
      executionBackend: 'cursor',
      iterations: 5,
    });
  });

  test('maps orchestrator task mode snapshot', () => {
    const snapshot = buildPlanRunConfigSnapshotFromJobData({
      executionBackend: 'claude',
      mode: 'task',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      runKind: 'orchestrator',
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
    });

    expect(snapshot.target).toEqual({
      mode: 'task',
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
    });
    expect(snapshot.ralph.executionBackend).toBe('claude');
  });

  test('carries ralph.effort on the snapshot (plan and task runs)', () => {
    const plan = buildPlanRunConfigSnapshotFromJobData({
      executionBackend: 'cursor',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      ralph: { effort: 'max' },
      runKind: 'orchestrator',
    });
    expect(plan.ralph.effort).toBe('max');

    const task = buildPlanRunConfigSnapshotFromJobData({
      executionBackend: 'cursor',
      mode: 'task',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      ralph: { effort: 'low' },
      runKind: 'orchestrator',
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
    });
    expect(task.ralph.effort).toBe('low');
  });

  test('omits effort from the snapshot when unset', () => {
    const snapshot = buildPlanRunConfigSnapshotFromJobData({
      executionBackend: 'cursor',
      planId: '7a293e25-e50d-4d4e-86a0-768b779ab0d9',
      ralph: { iterations: 1 },
      runKind: 'orchestrator',
    });
    expect(snapshot.ralph).not.toHaveProperty('effort');
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
      ralph: { backend: 'claude', effort: 'high', iterations: 7, model: 'm-1' },
      taskId: null,
      workingDirectory: tmpdir(),
    });

    expect(rebuilt).toEqual(original);
  });

  test('keeps an opted-out worktree opted out instead of re-applying the default', () => {
    const { original, rebuilt } = roundTrip({
      mode: null,
      planId,
      ralph: { disableWorktree: true, ralphDebugCli: 'omit' },
      taskId: null,
      workingDirectory: null,
    });

    expect(original.ralph?.worktree).toBeUndefined();
    expect(rebuilt).toEqual(original);
  });

  test('carries the merged lifecycle hooks once (no double merge)', () => {
    const { original, rebuilt } = roundTrip({
      jobRunHooksJson: JSON.stringify({
        hooks: [
          {
            kind: 'prompt_profile',
            phase: 'beforeAll',
            prompt: '/agents/ralph',
            promptDelivery: 'named',
          },
        ],
      }),
      mode: null,
      planId,
      ralph: null,
      taskId: null,
      workingDirectory: null,
    });

    expect(original.jobRunHooks?.hooks).toHaveLength(1);
    expect(rebuilt).toEqual(original);
  });

  test('rebuilds a task-mode run', () => {
    const { original, rebuilt } = roundTrip({
      mode: 'task',
      planId,
      ralph: null,
      taskId: '45a30762-92a9-42f4-90e0-2437c7ef26a8',
      workingDirectory: null,
    });

    expect(rebuilt).toEqual(original);
  });
});
