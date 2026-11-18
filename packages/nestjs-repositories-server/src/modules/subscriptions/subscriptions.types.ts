import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { Subscription } from './subscription.entity.ts';
import type { SubscriptionsRepository } from './subscriptions.repository.ts';

/**
 * Scalar/column fields of {@link Subscription} (no relations).
 * @public
 */
export type SubscriptionData = Pick<
  Subscription,
  | 'cancelAtPeriodEnd'
  | 'createdAt'
  | 'currentPeriodEnd'
  | 'currentPeriodStart'
  | 'deletedAt'
  | 'id'
  | 'status'
  | 'stripeCustomerId'
  | 'stripePriceId'
  | 'stripeSubscriptionId'
  | 'updatedAt'
  | 'userId'
>;

/**
 * @description What a Stripe webhook writes for one subscription; the Stripe subscription id
 * is the upsert key, passed separately.
 * @public
 */
export type SubscriptionUpsertInput = Omit<
  CreateModelInput<Subscription>,
  'stripeSubscriptionId' | 'user'
>;

/**
 * @description A {@link SubscriptionsRepository} mock: every inherited `BaseRepository` method
 * plus the Stripe lookups and the upsert.
 * @public
 */
export interface SubscriptionsRepositoryMock extends BaseRepositoryMock<
  Subscription,
  CreateModelInput<Subscription>
> {
  readonly findActiveByUserId: Mock<
    SubscriptionsRepository['findActiveByUserId']
  >;
  readonly findByStripeSubscriptionId: Mock<
    SubscriptionsRepository['findByStripeSubscriptionId']
  >;
  readonly findByUserId: Mock<SubscriptionsRepository['findByUserId']>;
  readonly upsertByStripeSubscriptionId: Mock<
    SubscriptionsRepository['upsertByStripeSubscriptionId']
  >;
}
