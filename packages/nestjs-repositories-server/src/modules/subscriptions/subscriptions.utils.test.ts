import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createSubscriptionsRepositoryMock } from './subscriptions.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('createSubscriptionsRepositoryMock', () => {
  it('starts as an empty table', async () => {
    const repository = createSubscriptionsRepositoryMock();

    await expect(repository.findActiveByUserId(userId)).resolves.toBeNull();
    await expect(
      repository.findByStripeSubscriptionId('sub_1'),
    ).resolves.toBeNull();
    await expect(repository.findByUserId(userId)).resolves.toEqual([]);
  });

  it('echoes an upsert back as a row keyed by the Stripe id', async () => {
    const repository = createSubscriptionsRepositoryMock();

    await expect(
      repository.upsertByStripeSubscriptionId('sub_1', {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        status: 'active',
        stripeCustomerId: null,
        stripePriceId: 'price_1',
        userId,
      }),
    ).resolves.toMatchObject({
      status: 'active',
      stripeSubscriptionId: 'sub_1',
      userId,
    });
  });

  it('names the subscriptions table in inherited not-found errors', async () => {
    const repository = createSubscriptionsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'subscriptions record with ID "a" not found',
    );
  });
});
