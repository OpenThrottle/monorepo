/**
 * @description Checkout-related types. Extend as needed for Stripe checkout flow.
 */
export type CheckoutSessionStatus = 'pending' | 'complete' | 'expired';

/** Line item shown in checkout summary (e.g. plan name, price, interval). */
export interface CheckoutLineItem {
  readonly interval?: string;
  readonly label: string;
  readonly priceCents: number;
}
