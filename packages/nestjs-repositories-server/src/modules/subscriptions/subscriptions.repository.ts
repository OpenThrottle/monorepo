import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  CreateModelInput,
  PaginationInput,
  PaginationOptions,
} from '@openthrottle/nestjs-postgres';
import {
  BaseRepository,
  resolvePagination,
} from '@openthrottle/nestjs-postgres';
import { In, Repository } from 'typeorm';

import { Subscription } from './subscription.entity.ts';
import { SUBSCRIPTION_ACTIVE_STATUSES } from './subscriptions.constants.ts';
import type { SubscriptionUpsertInput } from './subscriptions.types.ts';

/**
 * @description Data access for the openthrottle `subscriptions` table on the default
 * connection: the `BaseRepository` CRUD (soft deletes, so billing history stays) plus the
 * Stripe lookups and the idempotent webhook upsert. Every read sees live rows only.
 * @public
 */
@Injectable()
export class SubscriptionsRepository extends BaseRepository<
  Subscription,
  CreateModelInput<Subscription>
> {
  protected readonly tableName = 'subscriptions';

  constructor(
    @InjectRepository(Subscription)
    repository: Repository<Subscription>,
  ) {
    super(repository);
  }

  /**
   * @description The live subscription with this Stripe subscription id, or null.
   */
  async findByStripeSubscriptionId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | null> {
    return this.findOne({ where: { stripeSubscriptionId } });
  }

  /**
   * @description The user's active subscription (status `active` or `trialing`) with the
   * latest period end, or null.
   */
  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return this.findOne({
      order: { currentPeriodEnd: 'DESC' },
      where: { status: In([...SUBSCRIPTION_ACTIVE_STATUSES]), userId },
    });
  }

  /**
   * @description The user's subscriptions, newest first, in one clamped `{ limit, offset }`
   * page so the result stays bounded.
   */
  async findByUserId(
    userId: string,
    pagination?: PaginationInput,
    options?: PaginationOptions,
  ): Promise<Subscription[]> {
    const { skip, take } = resolvePagination(pagination, options);
    return this.findBy({
      order: { createdAt: 'DESC' },
      skip,
      take,
      where: { userId },
    });
  }

  /**
   * @description Upserts by Stripe subscription id: updates the live row when there is one,
   * otherwise creates it. Idempotent for webhook redelivery.
   */
  async upsertByStripeSubscriptionId(
    stripeSubscriptionId: string,
    input: SubscriptionUpsertInput,
  ): Promise<Subscription> {
    const existing =
      await this.findByStripeSubscriptionId(stripeSubscriptionId);
    if (existing) {
      return this.update(existing.id, input);
    }

    return this.create({ ...input, stripeSubscriptionId });
  }
}
