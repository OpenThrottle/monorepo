import { describe, expect, test } from 'vitest';

import { buildPlanToolbarRunFields } from '../buildPlanToolbarRunFields';

const base = {
  branch: undefined,
  checkoutId: undefined,
  jobRunHooksJson: '',
  ralphTuningJson: '',
  repositoryId: undefined,
  workingDirectory: undefined,
};

describe('buildPlanToolbarRunFields', () => {
  test('always carries the intent and the tuning, even when blank', () => {
    expect(buildPlanToolbarRunFields(base)).toEqual({
      intent: 'runPlan',
      ralphTuning: '',
    });
  });

  test('adds each set field and leaves blank ones out', () => {
    expect(
      buildPlanToolbarRunFields({
        ...base,
        branch: 'main',
        checkoutId: '',
        jobRunHooksJson: '{"hooks":[]}',
        ralphTuningJson: '{"iterations":3}',
        repositoryId: 'repo-1',
        workingDirectory: '/work',
      }),
    ).toEqual({
      branch: 'main',
      intent: 'runPlan',
      jobRunHooksJson: '{"hooks":[]}',
      ralphTuning: '{"iterations":3}',
      repositoryId: 'repo-1',
      workingDirectory: '/work',
    });
  });
});
