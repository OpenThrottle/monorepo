import { describe, expect, test } from 'vitest';

import { buildPlanToolbarRunFields } from '../buildPlanToolbarRunFields';

const base = {
  branch: undefined,
  checkoutId: undefined,
  jobRunHooksJson: '',
  repositoryId: undefined,
  runTuningJson: '',
  workingDirectory: undefined,
};

describe('buildPlanToolbarRunFields', () => {
  test('always carries the intent and the tuning, even when blank', () => {
    expect(buildPlanToolbarRunFields(base)).toEqual({
      intent: 'runPlan',
      runTuning: '',
    });
  });

  test('adds each set field and leaves blank ones out', () => {
    expect(
      buildPlanToolbarRunFields({
        ...base,
        branch: 'main',
        checkoutId: '',
        jobRunHooksJson: '{"hooks":[]}',
        repositoryId: 'repo-1',
        runTuningJson: '{"effort":"low"}',
        workingDirectory: '/work',
      }),
    ).toEqual({
      branch: 'main',
      intent: 'runPlan',
      jobRunHooksJson: '{"hooks":[]}',
      repositoryId: 'repo-1',
      runTuning: '{"effort":"low"}',
      workingDirectory: '/work',
    });
  });
});
