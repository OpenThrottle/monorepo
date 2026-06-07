import { describe, expect, it } from 'vitest';
import {
  maxSortOrderFromTasks,
  resolveBatchCreateSortOrders,
  TASK_SORT_ORDER_GAP,
} from './batch-create-sort-order.js';

describe('maxSortOrderFromTasks', () => {
  it('returns null when no tasks have sortOrder', () => {
    expect(maxSortOrderFromTasks([{}])).toBe(null);
    expect(maxSortOrderFromTasks([])).toBe(null);
  });

  it('returns the highest sortOrder', () => {
    expect(
      maxSortOrderFromTasks([
        { sortOrder: 1000 },
        { sortOrder: 5000 },
        { sortOrder: 2000 },
      ]),
    ).toBe(5000);
  });
});

describe('resolveBatchCreateSortOrders', () => {
  it('starts at 1000 when plan is empty and all items omit sortOrder', () => {
    expect(
      resolveBatchCreateSortOrders(null, [{ title: 'a' }, { title: 'b' }]),
    ).toEqual([1000, 2000]);
  });

  it('appends after existing max with gap', () => {
    expect(
      resolveBatchCreateSortOrders(3000, [
        { title: 'a' },
        { title: 'b' },
        { title: 'c' },
      ]),
    ).toEqual([4000, 5000, 6000]);
  });

  it('respects explicit sortOrder per item', () => {
    expect(
      resolveBatchCreateSortOrders(2000, [
        { sortOrder: 1500 },
        { title: 'implicit' },
        { sortOrder: 9000 },
        { title: 'implicit too' },
      ]),
    ).toEqual([1500, 3000, 9000, 4000]);
  });

  it('uses TASK_SORT_ORDER_GAP of 1000', () => {
    expect(TASK_SORT_ORDER_GAP).toBe(1000);
  });
});
