import { describe, expect, it } from 'vitest';

import { getCheckoutBranchSuffix } from '~/routing/plans/utils/checkout-branch-suffix';

describe('getCheckoutBranchSuffix', () => {
  describe('when the checkout has no current branch', () => {
    it('returns an empty string', () => {
      expect(getCheckoutBranchSuffix(undefined)).toBe('');
      expect(getCheckoutBranchSuffix(null)).toBe('');
      expect(getCheckoutBranchSuffix('')).toBe('');
    });
  });

  describe('when the checkout has a current branch', () => {
    it('returns it behind a separator', () => {
      expect(getCheckoutBranchSuffix('main')).toBe(' · main');
    });
  });
});
