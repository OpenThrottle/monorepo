/**
 * Batching under a count and a byte budget at once.
 */
import { describe, expect, it } from 'vitest';

import { chunkByBudget } from '../../index.ts';

const ones = (count: number): number[] =>
  Array.from({ length: count }, () => 1);

describe('chunkByBudget', () => {
  it('returns no batches for no items', () => {
    expect(
      chunkByBudget([], { maxBytes: 10, maxItems: 10, sizeOf: () => 1 }),
    ).toEqual([]);
  });

  describe('when the count binds first', () => {
    it('cuts at maxItems', () => {
      const sizes = chunkByBudget(ones(1200), {
        maxBytes: Infinity,
        maxItems: 500,
        sizeOf: () => 1,
      }).map((batch) => batch.length);
      expect(sizes).toEqual([500, 500, 200]);
    });

    it('treats a maxItems below 1 as 1', () => {
      expect(
        chunkByBudget([1, 2], {
          maxBytes: Infinity,
          maxItems: 0,
          sizeOf: () => 1,
        }),
      ).toEqual([[1], [2]]);
    });
  });

  describe('when the byte budget binds first', () => {
    it('cuts before the item that would overflow it, keeping order', () => {
      expect(
        chunkByBudget([4, 4, 4, 1, 9], {
          maxBytes: 9,
          maxItems: 100,
          sizeOf: (item) => item,
        }),
      ).toEqual([[4, 4], [4, 1], [9]]);
    });

    it('gives an item larger than the budget a batch of its own', () => {
      expect(
        chunkByBudget([1, 50, 1], {
          maxBytes: 10,
          maxItems: 100,
          sizeOf: (item) => item,
        }),
      ).toEqual([[1], [50], [1]]);
    });
  });
});
