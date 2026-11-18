import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { Subscription } from './subscription.entity.ts';
import { subscriptionsFactory } from './subscriptions.factory.ts';
import type {
  SubscriptionsRepositoryMock,
  SubscriptionUpsertInput,
} from './subscriptions.types.ts';

/**
 * @description Builds a {@link SubscriptionsRepositoryMock} that starts as an empty
 * `subscriptions` table (see `createBaseRepositoryMock`): the lookups find nothing and the
 * upsert echoes its input back as a new row. Provide it in place of `SubscriptionsRepository`
 * and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createSubscriptionsRepositoryMock(): SubscriptionsRepositoryMock {
  return {
    ...createBaseRepositoryMock<Subscription, CreateModelInput<Subscription>>(
      'subscriptions',
    ),
    findActiveByUserId: vi.fn(async () => {
      return null;
    }),
    findByStripeSubscriptionId: vi.fn(async () => {
      return null;
    }),
    findByUserId: vi.fn(async () => {
      return [];
    }),
    upsertByStripeSubscriptionId: vi.fn(
      async (stripeSubscriptionId: string, input: SubscriptionUpsertInput) => {
        return { ...subscriptionsFactory.build(input), stripeSubscriptionId };
      },
    ),
  };
}
