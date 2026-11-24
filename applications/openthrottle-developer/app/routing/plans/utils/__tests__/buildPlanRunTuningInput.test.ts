import { describe, expect, test } from 'vitest';

import { buildPlanRunTuningInput } from '../buildPlanRunTuningInput';
import type { PlanRunOptions } from '../plan-run-options';
import { DEFAULT_RUN_MODEL } from '../plan-run-options';

const basePlanInput = (
  overrides: Partial<PlanRunOptions> = {},
): PlanRunOptions => {
  return {
    driver: 'cursor',
    effort: '',
    iterationTimeoutSeconds: undefined,
    model: DEFAULT_RUN_MODEL,
    planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    targetMode: 'plan',
    taskId: '',
    worktreeCleanup: 'on-pr',
    worktreeName: '',
    ...overrides,
  };
};

describe('buildPlanRunTuningInput', () => {
  test('returns undefined when every field matches the defaults', () => {
    expect(buildPlanRunTuningInput(basePlanInput())).toBeUndefined();
  });

  test('sets driver when it differs from the default agent', () => {
    expect(
      buildPlanRunTuningInput(basePlanInput({ driver: 'claude' })),
    ).toEqual({ driver: 'claude' });
  });

  test('sets effort only when one is chosen', () => {
    expect(
      buildPlanRunTuningInput(basePlanInput({ effort: ' high ' })),
    ).toEqual({ effort: 'high' });
  });

  test('sets a floored iterationTimeoutSeconds when >= 1', () => {
    expect(
      buildPlanRunTuningInput(basePlanInput({ iterationTimeoutSeconds: 90.7 })),
    ).toEqual({ iterationTimeoutSeconds: 90 });
  });

  test('omits iterationTimeoutSeconds when below 1 or unset', () => {
    expect(
      buildPlanRunTuningInput(basePlanInput({ iterationTimeoutSeconds: 0 })),
    ).toBeUndefined();
    expect(
      buildPlanRunTuningInput(
        basePlanInput({ iterationTimeoutSeconds: undefined }),
      ),
    ).toBeUndefined();
  });

  test('sets a trimmed model when it differs from the default', () => {
    expect(
      buildPlanRunTuningInput(basePlanInput({ model: '  gpt-5  ' })),
    ).toEqual({ model: 'gpt-5' });
  });

  test('omits model when blank or the default', () => {
    expect(
      buildPlanRunTuningInput(basePlanInput({ model: '   ' })),
    ).toBeUndefined();
    expect(
      buildPlanRunTuningInput(basePlanInput({ model: DEFAULT_RUN_MODEL })),
    ).toBeUndefined();
  });

  test('sets worktreeName to the trimmed explicit name', () => {
    expect(
      buildPlanRunTuningInput(basePlanInput({ worktreeName: '  my-tree  ' })),
    ).toEqual({ worktreeName: 'my-tree' });
  });

  test('omits worktreeName when blank, so the server derives it from the plan id', () => {
    expect(
      buildPlanRunTuningInput(basePlanInput({ worktreeName: '   ' })),
    ).toBeUndefined();
  });

  test('never sends fields only the retired runner read', () => {
    const tuning = buildPlanRunTuningInput(basePlanInput({ effort: 'high' }));

    expect(tuning).not.toHaveProperty('iterations');
    expect(tuning).not.toHaveProperty('prompt');
    expect(tuning).not.toHaveProperty('promptFile');
    expect(tuning).not.toHaveProperty('project');
    expect(tuning).not.toHaveProperty('skipWorktreeSetup');
    expect(tuning).not.toHaveProperty('worktreeBase');
    expect(tuning).not.toHaveProperty('disableWorktree');
  });

  test('combines multiple non-default fields into one tuning object', () => {
    expect(
      buildPlanRunTuningInput(
        basePlanInput({
          driver: 'claude',
          effort: 'low',
          iterationTimeoutSeconds: 60,
          model: 'opus',
          worktreeName: 'wt',
        }),
      ),
    ).toEqual({
      driver: 'claude',
      effort: 'low',
      iterationTimeoutSeconds: 60,
      model: 'opus',
      worktreeName: 'wt',
    });
  });
});
