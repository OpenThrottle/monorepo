/**
 * @description TypeORM entity for the openthrottle `subscriptions` table: a Stripe customer and
 * subscription mapped to a user, with the entitlement state our API owns. It keeps the billing
 * history, so it extends `BaseModel` and a delete is a soft delete; the Stripe subscription id
 * is unique among live rows only. Matches databases/openthrottle/migrations (035, 177).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { User } from '../users/user.entity.ts';

@Entity('subscriptions')
export class Subscription extends BaseModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'stripe_customer_id', nullable: true, type: 'text' })
  stripeCustomerId!: string | null;

  @Column({ name: 'stripe_subscription_id', nullable: true, type: 'text' })
  stripeSubscriptionId!: string | null;

  @Column({ name: 'stripe_price_id', type: 'text' })
  stripePriceId!: string;

  @Column({ name: 'status', type: 'text' })
  status!: string;

  @Column({
    name: 'current_period_start',
    nullable: true,
    type: 'timestamp with time zone',
  })
  currentPeriodStart!: Date | null;

  @Column({
    name: 'current_period_end',
    nullable: true,
    type: 'timestamp with time zone',
  })
  currentPeriodEnd!: Date | null;

  @Column({ default: false, name: 'cancel_at_period_end', type: 'boolean' })
  cancelAtPeriodEnd!: boolean;
}
