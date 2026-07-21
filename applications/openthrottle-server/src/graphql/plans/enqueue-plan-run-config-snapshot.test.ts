import { describe, expect, test } from 'vitest';
import { buildPlanRunConfigSnapshotFromJobData } from './enqueue-plan-run-config-snapshot';

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
});
