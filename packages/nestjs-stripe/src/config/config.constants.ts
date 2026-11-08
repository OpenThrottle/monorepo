/**
 * @public
 * @description Pinned Stripe API version. Decouples response shapes from the account's
 * dashboard default so a Stripe-side default bump cannot silently change payload structure.
 * Matches the version the installed `stripe` SDK types are generated against.
 */
export const STRIPE_API_VERSION = '2026-02-25.clover' as const;

/**
 * @description Automatic retries for transient network errors (timeouts, connection resets) on
 * idempotent requests. Without this, a single flaky connection surfaces as a hard failure
 * (checkout 500, or a webhook 4xx that makes Stripe re-deliver the whole event).
 */
export const STRIPE_MAX_NETWORK_RETRIES = 2 as const;
