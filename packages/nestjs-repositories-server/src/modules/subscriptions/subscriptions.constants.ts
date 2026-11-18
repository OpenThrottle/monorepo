/**
 * @description The Stripe subscription statuses that grant entitlement: what
 * `SubscriptionsRepository.findActiveByUserId` treats as an active subscription.
 * @public
 */
export const SUBSCRIPTION_ACTIVE_STATUSES = ['active', 'trialing'] as const;
