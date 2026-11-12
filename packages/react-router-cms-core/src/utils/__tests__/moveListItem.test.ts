import { describe, expect, test } from 'vitest';

import { moveListItem } from '../moveListItem';

const list = ['a', 'b', 'c', 'd'];

describe('moveListItem', () => {
  describe('when moving down', () => {
    test('places the item at the target index', () => {
      expect(moveListItem({ fromIndex: 0, list, toIndex: 2 })).toEqual([
        'b',
        'c',
        'a',
        'd',
      ]);
    });
  });

  describe('when moving up', () => {
    test('places the item at the target index', () => {
      expect(moveListItem({ fromIndex: 3, list, toIndex: 1 })).toEqual([
        'a',
        'd',
        'b',
        'c',
      ]);
    });
  });

  describe('when the indices match', () => {
    test('returns the same list', () => {
      expect(moveListItem({ fromIndex: 1, list, toIndex: 1 })).toBe(list);
    });
  });

  describe('when an index is out of range', () => {
    test.each([
      { fromIndex: -1, toIndex: 0 },
      { fromIndex: 0, toIndex: 4 },
      { fromIndex: 1.5, toIndex: 0 },
    ])('returns the same list for $fromIndex → $toIndex', (indices) => {
      expect(moveListItem({ ...indices, list })).toBe(list);
    });
  });

  test('never mutates the input', () => {
    const input = ['x', 'y'];
    moveListItem({ fromIndex: 0, list: input, toIndex: 1 });
    expect(input).toEqual(['x', 'y']);
  });
});
