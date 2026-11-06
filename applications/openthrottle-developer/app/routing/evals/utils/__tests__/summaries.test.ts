import { describe, expect, test } from 'vitest';

import { TRAJECTORY_SUMMARY_COPY } from '~/routing/evals/data/data.copy';
import {
  MOCK_TRAJECTORY_SUMMARY,
  MOCK_UNPRICED_SESSION_SUMMARY,
} from '~/routing/evals/data/mock.trajectory';

import {
  buildTrajectorySummaryFacts,
  sortTrajectoriesNewestFirst,
} from '../summaries';

describe('sortTrajectoriesNewestFirst', () => {
  test('puts the latest recording first without mutating the input', () => {
    const input = [MOCK_TRAJECTORY_SUMMARY, MOCK_UNPRICED_SESSION_SUMMARY];
    const sorted = sortTrajectoriesNewestFirst(input);

    expect(sorted.map((row) => row.id)).toEqual([
      'trajectory-2',
      'trajectory-1',
    ]);
    expect(input[0]?.id).toBe('trajectory-1');
  });
});

describe('buildTrajectorySummaryFacts', () => {
  test('reads an unpriced run as unpriced', () => {
    const facts = buildTrajectorySummaryFacts(MOCK_UNPRICED_SESSION_SUMMARY);
    const cost = facts.find(
      (fact) => fact.label === TRAJECTORY_SUMMARY_COPY.cost,
    );

    expect(cost?.value).toBe(TRAJECTORY_SUMMARY_COPY.unpriced);
  });

  test('includes the exit code', () => {
    const facts = buildTrajectorySummaryFacts(MOCK_TRAJECTORY_SUMMARY);
    const exit = facts.find(
      (fact) => fact.label === TRAJECTORY_SUMMARY_COPY.exitCode,
    );

    expect(exit?.value).toBe('1');
  });
});
