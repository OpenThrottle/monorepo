import { describe, expect, test } from 'vitest';

import {
  groupRuleApplicationsByState,
  parseRuleApplicationDetails,
} from '../rule-applications';

const row = (id: string, state: string) => {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    id,
    planId: 'plan-1',
    ruleId: 'rule-1',
    state,
  };
};

describe('groupRuleApplicationsByState', () => {
  test('orders groups attention-first and drops empty ones', () => {
    const groups = groupRuleApplicationsByState([
      row('a', 'applied'),
      row('b', 'flagged'),
      row('c', 'applied'),
      row('d', 'orphaned'),
    ]);

    expect(groups.map((group) => group.state)).toEqual([
      'flagged',
      'orphaned',
      'applied',
    ]);
    expect(
      groups[2]?.applications.map((application) => application.id),
    ).toEqual(['a', 'c']);
  });

  test('leaves out rows with an unrecognised state', () => {
    expect(groupRuleApplicationsByState([row('a', 'mystery')])).toEqual([]);
  });

  test('returns no groups for no rows', () => {
    expect(groupRuleApplicationsByState([])).toEqual([]);
  });
});

describe('parseRuleApplicationDetails', () => {
  test('splits reason, ruleId and promptId from the extras', () => {
    expect(
      parseRuleApplicationDetails(
        '{"reason":"superseded-by","ruleId":"r-2","promptId":"p-1","skillSlug":"grilling","count":2}',
      ),
    ).toEqual({
      extras: [
        ['skillSlug', 'grilling'],
        ['count', '2'],
      ],
      promptId: 'p-1',
      reason: 'superseded-by',
      ruleId: 'r-2',
    });
  });

  test.each([null, undefined, '', '{', '[1]', '"text"', 'null'])(
    'yields empty details for %j',
    (input) => {
      expect(parseRuleApplicationDetails(input)).toEqual({
        extras: [],
        promptId: null,
        reason: null,
        ruleId: null,
      });
    },
  );
});
