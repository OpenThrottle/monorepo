import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { asMock } from '@openthrottle/nestjs-testing';
import type { DeepPartial } from 'typeorm';
import { Subscription } from './subscription.entity';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  type Repo = {
    create: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    merge: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  let service: SubscriptionsService;
  let repository: Repo;

  const stripeSubscriptionId = 'sub_ABC123';

  beforeEach(async () => {
    repository = {
      create: vi.fn((data: DeepPartial<Subscription>) =>
        asMock<Subscription>(data),
      ),
      findOne: vi.fn(),
      merge: vi.fn((target: Subscription, data: DeepPartial<Subscription>) =>
        Object.assign(target, data),
      ),
      save: vi.fn(async (entity: Subscription) => entity),
    };

    const app = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: repository,
        },
      ],
    }).compile();

    service = app.get(SubscriptionsService);
  });

  describe('upsertByStripeSubscriptionId', () => {
    it('merges and saves the existing row when one matches the Stripe id', async () => {
      const existing = asMock<Subscription>({
        id: 'existing-id',
        status: 'trialing',
        stripeSubscriptionId,
      });
      vi.mocked(repository.findOne).mockResolvedValue(existing);

      const result = await service.upsertByStripeSubscriptionId(
        stripeSubscriptionId,
        { status: 'active' },
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { stripeSubscriptionId },
      });
      expect(repository.merge).toHaveBeenCalledWith(existing, {
        status: 'active',
      });
      expect(repository.create).not.toHaveBeenCalled();
      expect(result.id).toBe('existing-id');
      expect(result.status).toBe('active');
    });

    it('creates a new row carrying the Stripe id when no row matches', async () => {
      vi.mocked(repository.findOne).mockResolvedValue(null);

      const result = await service.upsertByStripeSubscriptionId(
        stripeSubscriptionId,
        { status: 'active', userId: 'user-1' },
      );

      expect(repository.merge).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith({
        status: 'active',
        stripeSubscriptionId,
        userId: 'user-1',
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.stripeSubscriptionId).toBe(stripeSubscriptionId);
      expect(result.status).toBe('active');
    });

    it('is idempotent for webhook replays — a second call merges the same existing row', async () => {
      const existing = asMock<Subscription>({
        id: 'existing-id',
        status: 'active',
        stripeSubscriptionId,
      });
      vi.mocked(repository.findOne).mockResolvedValue(existing);

      await service.upsertByStripeSubscriptionId(stripeSubscriptionId, {
        status: 'active',
      });
      await service.upsertByStripeSubscriptionId(stripeSubscriptionId, {
        status: 'active',
      });

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledTimes(2);
    });
  });
});
