import { describe, expect, test } from 'vitest';

import { buildPlanRunTuningDiffLabels } from '../buildPlanRunTuningDiffLabels';
import type { PlanRunOptions } from '../plan-run-options';
import { getDefaultPlanRunOptions } from '../plan-run-options';

const baseline: PlanRunOptions = getDefaultPlanRunOptions({ planId: 'plan-1' });

describe('buildPlanRunTuningDiffLabels', () => {
  test('returns no lines when the input matches the baseline defaults', () => {
    expect(buildPlanRunTuningDiffLabels(baseline, '')).toEqual([]);
  });

  test('reports a driver change', () => {
    const input: PlanRunOptions = { ...baseline, driver: 'claude' };
    const lines = buildPlanRunTuningDiffLabels(input, '');
    expect(lines).toContain('Driver: cursor → claude');
  });

  test('reports an agent timeout change parsed from the text field', () => {
    const lines = buildPlanRunTuningDiffLabels(baseline, '45');
    expect(lines).toContain('Agent timeout (seconds): default → 45');
  });

  test('ignores an unparseable agent timeout text (still the default)', () => {
    expect(buildPlanRunTuningDiffLabels(baseline, 'nope')).toEqual([]);
  });

  test('reports a model change, substituting the default label for an empty model', () => {
    const input: PlanRunOptions = { ...baseline, model: 'gpt-5' };
    const lines = buildPlanRunTuningDiffLabels(input, '');
    expect(lines).toContain('Model: auto → gpt-5');
  });

  test('reports a worktree name override', () => {
    const input: PlanRunOptions = {
      ...baseline,
      worktreeName: 'my-worktree',
    };
    const lines = buildPlanRunTuningDiffLabels(input, '');
    expect(lines.some((line) => line.startsWith('Worktree name:'))).toBe(true);
  });

  test('reports a worktree cleanup change', () => {
    const input: PlanRunOptions = { ...baseline, worktreeCleanup: 'keep' };
    const lines = buildPlanRunTuningDiffLabels(input, '');
    expect(lines).toContain('Worktree cleanup: on-pr → keep');
  });

  test('reports an effort change against the unset baseline', () => {
    const input: PlanRunOptions = { ...baseline, effort: 'high' };
    const lines = buildPlanRunTuningDiffLabels(input, '');
    expect(lines).toContain('Effort: default → high');
  });
});
