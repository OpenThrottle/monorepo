/**
 * @description Fishery factory for `subscriptions` rows. Use in tests to build mock Stripe
 * subscriptions.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { SubscriptionData } from './subscriptions.types.ts';

/**
 * @description Builds Subscription-shaped plain objects: a live, active monthly subscription
 * by default. Override any field via `.build({ ... })`.
 * @public
 */
export const subscriptionsFactory = Factory.define<SubscriptionData>(() => {
  const currentPeriodStart = faker.date.recent({ days: 20 });
  const currentPeriodEnd = new Date(
    currentPeriodStart.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  return {
    cancelAtPeriodEnd: false,
    createdAt: faker.date.past(),
    currentPeriodEnd,
    currentPeriodStart,
    deletedAt: null,
    id: faker.string.uuid(),
    status: 'active',
    stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
    stripePriceId: `price_${faker.string.alphanumeric(14)}`,
    stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
    updatedAt: faker.date.recent(),
    userId: faker.string.uuid(),
  };
});
