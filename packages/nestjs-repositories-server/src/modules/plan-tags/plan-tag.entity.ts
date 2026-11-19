/**
 * @description TypeORM entity for the openthrottle `plan_tags` table: one row per (plan_id, tag).
 * Attaching and detaching a tag is a toggle, so it extends `BaseHardDeleteModel` and a delete
 * is a hard delete. It keeps its own `updated_at` for provenance upgrades.
 * Matches databases/openthrottle/migrations (064, 179).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';

import type { TagSource } from '../plan-tags/tag-source/tag-source.types.ts';
import type { Plan } from '../plans/plan.entity.ts';

@Entity('plan_tags')
export class PlanTag extends BaseHardDeleteModel {
  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne('Plan', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;

  @Column({ name: 'tag', type: 'text' })
  tag!: string;

  @Column({ name: 'dimension', type: 'text' })
  dimension!: string;

  @Column({ name: 'source', type: 'text' })
  source!: TagSource;

  @Column({
    name: 'confidence',
    nullable: true,
    transformer: {
      from: (value: string | null): number | null =>
        value == null ? null : Number(value),
      to: (value: number | null): number | null => value,
    },
    type: 'numeric',
  })
  confidence!: number | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
