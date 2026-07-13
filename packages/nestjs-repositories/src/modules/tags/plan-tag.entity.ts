/**
 * @description TypeORM entity for plan_tags. Matches databases/migrations/064.
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
import { Plan } from '../plans/plan.entity';
import type { TagSource } from './tag-provenance';

export interface PlanTagData {
  readonly confidence: number | null;
  readonly dimension: string;
  readonly id: string;
  readonly planId: string;
  readonly source: TagSource;
  readonly tag: string;
}

@Entity('plan_tags')
export class PlanTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
