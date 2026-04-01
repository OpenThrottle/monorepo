import {
  CHECKOUT_INTERVAL_PARAM,
  CHECKOUT_PLAN_PARAM,
  CHECKOUT_ROUTE_PREFIX,
} from '../config';

/**
 * @description Builds the checkout path with optional plan and interval search params for entry from pricing CTA.
 */
export function buildCheckoutPath(planId: string, interval: string): string {
  const params = new URLSearchParams();
  params.set(CHECKOUT_PLAN_PARAM, planId);
  params.set(CHECKOUT_INTERVAL_PARAM, interval);
  return `${CHECKOUT_ROUTE_PREFIX}?${params.toString()}`;
}
