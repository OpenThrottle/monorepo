/**
 * @description TypeORM entity for Cortex subscriptions table. Matches databases/migrations/035.
 * Maps Stripe customer/subscription to users; entitlement state owned by our API.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { User } from '../users/user.entity';

/** Scalar/column fields of Subscription (no relations). */
export type SubscriptionData = Pick<
  Subscription,
  | 'cancelAtPeriodEnd'
  | 'createdAt'
  | 'currentPeriodEnd'
  | 'currentPeriodStart'
  | 'id'
  | 'status'
  | 'stripeCustomerId'
  | 'stripePriceId'
  | 'stripeSubscriptionId'
  | 'updatedAt'
  | 'userId'
>;

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
