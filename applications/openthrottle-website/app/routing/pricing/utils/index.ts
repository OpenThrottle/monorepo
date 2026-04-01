import { PRICING_INTERVAL_PARAM } from '~/routing/pricing/config';
import type { BillingInterval } from '~/routing/pricing/types';

/**
 * @description Reads billing interval from URL search params; defaults to monthly.
 * Normalizes casing so `interval=yearly`, `Yearly`, and `YEARLY` all show yearly pricing.
 */
export function parseIntervalFromSearchParams(
  searchParams: URLSearchParams,
): BillingInterval {
  const raw = searchParams.get(PRICING_INTERVAL_PARAM);
  return raw?.toLowerCase() === 'yearly' ? 'yearly' : 'monthly';
}
