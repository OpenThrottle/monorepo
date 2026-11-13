import { describe, expect, it } from 'vitest';

import {
  getCmsChildEdgeRefusal,
  getCmsReorderRefusal,
} from './cms-fragment-children.utils.ts';

describe('getCmsChildEdgeRefusal', () => {
  describe('when the child already reaches the parent', () => {
    it('refuses the cycle', () => {
      expect(
        getCmsChildEdgeRefusal({
          childHeight: 0,
          childReachesParent: true,
          parentDepth: 0,
        }),
      ).toMatch(/own descendant/);
    });
  });

  describe('when the new edge would go past depth 10', () => {
    it('refuses it', () => {
      expect(
        getCmsChildEdgeRefusal({
          childHeight: 3,
          childReachesParent: false,
          parentDepth: 7,
        }),
      ).toMatch(/depth 11/);
    });
  });

  describe('when the deepest node lands exactly at depth 10', () => {
    it('allows it', () => {
      expect(
        getCmsChildEdgeRefusal({
          childHeight: 2,
          childReachesParent: false,
          parentDepth: 7,
        }),
      ).toBeNull();
    });
  });
});

describe('getCmsReorderRefusal', () => {
  it('allows a permutation of the current children', () => {
    expect(getCmsReorderRefusal(['a', 'b', 'c'], ['c', 'a', 'b'])).toBeNull();
  });

  it('refuses a missing child', () => {
    expect(getCmsReorderRefusal(['a', 'b'], ['a'])).toMatch(/missing: b/);
  });

  it('refuses an extra child', () => {
    expect(getCmsReorderRefusal(['a'], ['a', 'z'])).toMatch(/not children: z/);
  });

  it('refuses a duplicate', () => {
    expect(getCmsReorderRefusal(['a', 'b'], ['a', 'a'])).toMatch(
      /more than once/,
    );
  });
});
