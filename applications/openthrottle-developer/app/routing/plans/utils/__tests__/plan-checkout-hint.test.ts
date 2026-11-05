import { describe, expect, it } from 'vitest';

import { PLAN_CHECKOUT_SELECTOR_COPY } from '~/routing/plans/data/data.copy';
import { getPlanCheckoutHint } from '~/routing/plans/utils/plan-checkout-hint';

const healthy = {
  minimal: false,
  minimalHint: undefined,
  optionCount: 2,
  selectionMissing: false,
};

describe('getPlanCheckoutHint', () => {
  describe('when the registry is empty', () => {
    it('returns the empty-registry hint over every other hint', () => {
      expect(
        getPlanCheckoutHint({
          ...healthy,
          minimal: true,
          optionCount: 0,
          selectionMissing: true,
        }),
      ).toBe(PLAN_CHECKOUT_SELECTOR_COPY.emptyRegistryHint);
    });
  });

  describe('when the selection is no longer registered', () => {
    it('returns the stale-checkout hint', () => {
      expect(
        getPlanCheckoutHint({
          ...healthy,
          minimal: true,
          selectionMissing: true,
        }),
      ).toBe(PLAN_CHECKOUT_SELECTOR_COPY.staleCheckoutHint);
    });
  });

  describe('when minimal and healthy', () => {
    it('returns the default minimal hint', () => {
      expect(getPlanCheckoutHint({ ...healthy, minimal: true })).toBe(
        PLAN_CHECKOUT_SELECTOR_COPY.minimalHint,
      );
    });

    it('prefers an explicit minimal hint', () => {
      expect(
        getPlanCheckoutHint({ ...healthy, minimal: true, minimalHint: 'Pick' }),
      ).toBe('Pick');
    });
  });

  describe('when full-size and healthy', () => {
    it('returns no hint', () => {
      expect(getPlanCheckoutHint(healthy)).toBeUndefined();
    });
  });
});
