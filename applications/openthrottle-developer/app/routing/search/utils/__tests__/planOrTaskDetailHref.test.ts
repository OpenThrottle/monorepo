import { describe, expect, test } from 'vitest';

import { planOrTaskDetailHref } from '../planOrTaskDetailHref';

describe('planOrTaskDetailHref', () => {
  test('should append task hash when taskId is set', () => {
    expect(planOrTaskDetailHref('p1', 't1')).toBe('/plans/p1#task-t1');
  });

  test('should omit hash when taskId is empty', () => {
    expect(planOrTaskDetailHref('p1', '')).toBe('/plans/p1');
    expect(planOrTaskDetailHref('p1', null)).toBe('/plans/p1');
  });
});
