import type { CheckoutDrift } from '~/routing/settings/utils/drift-labels';

export interface RefreshedDrift {
  readonly checkoutId: string;
  readonly drift: CheckoutDrift;
}

/**
 * @description Keys the last refresh's drift by checkout id so the table can mark
 * just that row; `undefined` when nothing was refreshed.
 */
export const buildDriftByCheckoutId = (
  refreshed: RefreshedDrift | null | undefined,
): Record<string, CheckoutDrift> | undefined => {
  if (!refreshed) {
    return undefined;
  }

  return { [refreshed.checkoutId]: refreshed.drift };
};
