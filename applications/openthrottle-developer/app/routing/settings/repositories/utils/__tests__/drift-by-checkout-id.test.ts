import { describe, expect, test } from 'vitest';

import { buildDriftByCheckoutId } from '../drift-by-checkout-id';

describe('buildDriftByCheckoutId', () => {
  test('returns undefined when nothing was refreshed', () => {
    expect(buildDriftByCheckoutId(null)).toBeUndefined();
    expect(buildDriftByCheckoutId(undefined)).toBeUndefined();
  });

  test('keys the drift by checkout id', () => {
    const drift = {
      branchMoved: true,
      pathMissing: false,
      remoteChanged: false,
    };

    expect(buildDriftByCheckoutId({ checkoutId: 'c1', drift })).toEqual({
      c1: drift,
    });
  });
});
