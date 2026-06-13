import { describe, expect, test } from 'vitest';
import {
  DEFAULT_RALPH_ITERATIONS,
  getDefaultWorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { buildPlanRunSnapshotDiffLabels } from '~/routing/plans/utils/plan-run-config-snapshot-ui';

const planId = '7a293e25-e50d-4d4e-86a0-768b779ab0d9';

describe('buildPlanRunSnapshotDiffLabels', () => {
  test('returns empty when snapshot matches current config', () => {
    const workflowInput = getDefaultWorkflowRalphRunOptionsInput({ planId });
    const snapshotJson = JSON.stringify({
      ralph: {
        executionBackend: workflowInput.executionBackend,
        iterations: workflowInput.iterations,
      },
      workspace: { workingDirectory: '' },
    });

    expect(
      buildPlanRunSnapshotDiffLabels(snapshotJson, {
        workflowInput,
        workingDirectory: '',
      }),
    ).toEqual([]);
  });

  test('reports backend, iterations, and workspace diffs', () => {
    const workflowInput = getDefaultWorkflowRalphRunOptionsInput({ planId });
    const snapshotJson = JSON.stringify({
      ralph: {
        executionBackend: 'claude',
        iterations: 3,
      },
      workspace: { workingDirectory: '/tmp/old' },
    });

    const labels = buildPlanRunSnapshotDiffLabels(snapshotJson, {
      workflowInput,
      workingDirectory: '/tmp/new',
    });

    expect(labels.some((line) => line.startsWith('Backend:'))).toBe(true);
    expect(labels.some((line) => line.includes('Iterations: 3'))).toBe(true);
    expect(labels.some((line) => line.startsWith('Workspace:'))).toBe(true);
    expect(
      labels.some((line) => line.includes(String(DEFAULT_RALPH_ITERATIONS))),
    ).toBe(true);
  });
});
