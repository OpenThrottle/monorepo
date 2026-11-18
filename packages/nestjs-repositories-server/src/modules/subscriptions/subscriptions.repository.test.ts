import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Subscription } from './subscription.entity.ts';
import { subscriptionsFactory } from './subscriptions.factory.ts';
import { SubscriptionsRepository } from './subscriptions.repository.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('SubscriptionsRepository', () => {
  const create = vi.fn();
  const find = vi.fn();
  const findOne = vi.fn();
  const save = vi.fn();

  let repository: SubscriptionsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    create.mockImplementation((data: Partial<Subscription>) => {
      return { ...data };
    });
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    save.mockImplementation(async (entity: Subscription) => {
      return entity;
    });

    const app = await Test.createTestingModule({
      providers: [
        SubscriptionsRepository,
        {
          provide: getRepositoryToken(Subscription),
          useValue: createMock<Repository<Subscription>>({
            create,
            find,
            findOne,
            save,
            target: Subscription,
          }),
        },
      ],
    }).compile();

    repository = app.get(SubscriptionsRepository);
  });

  describe('findByStripeSubscriptionId', () => {
    it('reads the row with that Stripe id', async () => {
      await expect(
        repository.findByStripeSubscriptionId('sub_1'),
      ).resolves.toBeNull();
      expect(findOne).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_1' },
      });
    });
  });

  describe('findActiveByUserId', () => {
    it('reads an active or trialing subscription, latest period first', async () => {
      await repository.findActiveByUserId(userId);

      expect(findOne).toHaveBeenCalledWith({
        order: { currentPeriodEnd: 'DESC' },
        where: { status: In(['active', 'trialing']), userId },
      });
    });
  });

  describe('findByUserId', () => {
    describe('when no pagination is given', () => {
      it('reads one default-sized page, newest first', async () => {
        await repository.findByUserId(userId);

        expect(find).toHaveBeenCalledWith(
          expect.objectContaining({
            order: { createdAt: 'DESC' },
            skip: 0,
            take: expect.any(Number),
            where: { userId },
          }),
        );
      });
    });

    describe('when pagination is given', () => {
      it('passes the offset and limit through', async () => {
        await repository.findByUserId(userId, { limit: 5, offset: 10 });

        expect(find).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 10, take: 5 }),
        );
      });
    });
  });

  describe('upsertByStripeSubscriptionId', () => {
    const input = {
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      currentPeriodStart: null,
      status: 'active',
      stripeCustomerId: 'cus_1',
      stripePriceId: 'price_1',
      userId,
    };

    describe('when a live row has the Stripe id', () => {
      it('updates it in place', async () => {
        const existing = subscriptionsFactory.build({
          status: 'trialing',
          stripeSubscriptionId: 'sub_1',
          userId,
        });
        findOne.mockResolvedValue(existing);

        const result = await repository.upsertByStripeSubscriptionId(
          'sub_1',
          input,
        );

        expect(result).toMatchObject({
          id: existing.id,
          status: 'active',
          stripeSubscriptionId: 'sub_1',
        });
        expect(create).not.toHaveBeenCalled();
      });
    });

    describe('when no live row has the Stripe id', () => {
      it('creates one keyed by it', async () => {
        const result = await repository.upsertByStripeSubscriptionId(
          'sub_1',
          input,
        );

        expect(create).toHaveBeenCalledWith({
          ...input,
          stripeSubscriptionId: 'sub_1',
        });
        expect(result).toMatchObject({ stripeSubscriptionId: 'sub_1' });
      });
    });
  });
});
