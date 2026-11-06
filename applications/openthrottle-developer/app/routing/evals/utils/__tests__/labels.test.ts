import { describe, expect, test } from 'vitest';

import {
  MOCK_MY_LABEL,
  MOCK_OTHER_LABEL,
} from '~/routing/evals/data/mock.trajectory';

import { splitTrajectoryLabels } from '../labels';

describe('splitTrajectoryLabels', () => {
  const labels = [MOCK_OTHER_LABEL, MOCK_MY_LABEL];

  test('finds your label by any of your identifiers', () => {
    const result = splitTrajectoryLabels(labels, {
      email: MOCK_MY_LABEL.rater,
      githubUsername: 'developer',
      id: 'user-1',
    });

    expect(result.mine).toBe(MOCK_MY_LABEL);
    expect(result.others).toEqual([MOCK_OTHER_LABEL]);
  });

  test('treats every label as another rater’s when you have none', () => {
    const result = splitTrajectoryLabels(labels, null);

    expect(result.mine).toBeNull();
    expect(result.others).toEqual(labels);
  });
});
