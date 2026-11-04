import { describe, expect, test } from 'vitest';

import {
  DEFAULT_RALPH_ITERATIONS,
  getDefaultWorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  buildPlanRunSnapshotDiffLabels,
  readPlanRunModel,
  readPlanRunSnapshotEffort,
} from '~/routing/plans/utils/plan-run-config-snapshot-ui';

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

const snapshotWith = (ralph: Record<string, unknown>): string =>
  JSON.stringify({ ralph, workspace: { workingDirectory: '' } });

describe('readPlanRunSnapshotEffort', () => {
  test('reads ralph.effort from the snapshot', () => {
    expect(readPlanRunSnapshotEffort(snapshotWith({ effort: 'high' }))).toBe(
      'high',
    );
  });

  test.each([
    ['a missing snapshot', null],
    ['an empty snapshot', ''],
    ['malformed JSON', '{nope'],
    ['no effort', snapshotWith({ model: 'opus' })],
    ['a blank effort', snapshotWith({ effort: '  ' })],
    ['a non-string effort', snapshotWith({ effort: 3 })],
  ])('returns null for %s', (_label, json) => {
    expect(readPlanRunSnapshotEffort(json)).toBeNull();
  });
});

describe('readPlanRunModel', () => {
  test('prefers the row model column', () => {
    expect(
      readPlanRunModel({
        model: 'claude-opus',
        runConfigSnapshotJson: snapshotWith({ model: 'claude-sonnet' }),
      }),
    ).toBe('claude-opus');
  });

  test('falls back to the snapshot ralph.model when the column is empty', () => {
    expect(
      readPlanRunModel({
        model: null,
        runConfigSnapshotJson: snapshotWith({ model: 'claude-sonnet' }),
      }),
    ).toBe('claude-sonnet');
    expect(
      readPlanRunModel({
        model: '',
        runConfigSnapshotJson: snapshotWith({ model: 'claude-sonnet' }),
      }),
    ).toBe('claude-sonnet');
  });

  test('returns null when neither records a model', () => {
    expect(
      readPlanRunModel({ model: null, runConfigSnapshotJson: null }),
    ).toBeNull();
  });
});
