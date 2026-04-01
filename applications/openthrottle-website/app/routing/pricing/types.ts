/**
 * @description Billing interval for pricing display. Used by {@link PricingToggle} and {@link PricingCard}.
 */
export type BillingInterval = 'monthly' | 'yearly';

/**
 * @description Options for the billing interval toggle. Add entries here to add or change toggle labels.
 */
export const BILLING_INTERVAL_OPTIONS: readonly {
  readonly label: string;
  readonly value: BillingInterval;
}[] = [
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
] as const;
