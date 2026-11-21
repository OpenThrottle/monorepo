import { describe, expect, test } from 'vitest';

import { selectVisibleConditions } from '../selectVisibleConditions';

const condition = (
  name: string,
  expected: string | null,
  passed: boolean,
): {
  actual: null;
  condition: string;
  expected: string | null;
  passed: boolean;
} => {
  return { actual: null, condition: name, expected, passed };
};

describe('selectVisibleConditions', () => {
  test('keeps qualified conditions, passed or failed', () => {
    const visible = selectVisibleConditions([
      condition('status', 'PENDING', true),
      condition('repository', 'repo-1', false),
    ]);

    expect(visible.map((result) => result.condition)).toEqual([
      'status',
      'repository',
    ]);
  });

  test('drops an unqualified condition that passed', () => {
    expect(selectVisibleConditions([condition('project', null, true)])).toEqual(
      [],
    );
  });
});
