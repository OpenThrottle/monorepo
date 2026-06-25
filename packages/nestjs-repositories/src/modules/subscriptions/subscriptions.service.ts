import type { DeepPartial } from 'typeorm/common/DeepPartial';
import { In } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  type ListPaginationInput,
  resolveListPagination,
} from '../../common/list-pagination';
import { Subscription } from './subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
  ) {}

  /**
   * @description Finds a subscription by id, or null if not found.
   */
  async findById(id: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({ where: { id } });
  }

  /**
   * @description Finds a subscription by Stripe subscription ID, or null if not found.
   */
  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { stripeSubscriptionId },
    });
  }

  /**
   * @description Finds the active subscription for a user (status active or trialing), or null.
   */
  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      order: { currentPeriodEnd: 'DESC' },
      where: { status: In(['active', 'trialing']), userId },
    });
  }

  /**
   * @description Finds subscriptions for a user, ordered by created_at
   * descending. Accepts an optional clamped `{ limit, offset }` so the result
   * set stays bounded.
   */
  async findByUserId(
    userId: string,
    pagination?: ListPaginationInput,
  ): Promise<Subscription[]> {
    const { skip, take } = resolveListPagination(pagination);
    return this.subscriptionRepository.find({
      order: { createdAt: 'DESC' },
      skip,
      take,
      where: { userId },
    });
  }

  /**
   * @description Creates a new subscription. Returns the saved entity.
   */
  async create(data: DeepPartial<Subscription>): Promise<Subscription> {
    const entity = this.subscriptionRepository.create(data);
    return this.subscriptionRepository.save(entity);
  }

  /**
   * @description Updates an existing subscription by id. Returns the saved entity or null if not found.
   */
  async update(
    id: string,
    data: DeepPartial<Subscription>,
  ): Promise<Subscription | null> {
    const existing = await this.subscriptionRepository.findOne({
      where: { id },
    });
    if (!existing) return null;
    this.subscriptionRepository.merge(existing, data);
    return this.subscriptionRepository.save(existing);
  }

  /**
   * @description Upserts by Stripe subscription ID: updates if exists, otherwise creates. Idempotent for webhooks.
   */
  async upsertByStripeSubscriptionId(
    stripeSubscriptionId: string,
    data: DeepPartial<Subscription>,
  ): Promise<Subscription> {
    const existing =
      await this.findByStripeSubscriptionId(stripeSubscriptionId);
    if (existing) {
      this.subscriptionRepository.merge(existing, data);
      return this.subscriptionRepository.save(existing);
    }
    return this.create({ ...data, stripeSubscriptionId });
  }
}
