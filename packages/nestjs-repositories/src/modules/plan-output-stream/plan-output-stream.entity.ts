/**
 * @description TypeORM entity for Cortex plan_output_stream table. Matches databases/cortex/migrations (007).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Plan } from '../plans/plan.entity';

@Entity('plan_output_stream')
export class PlanOutputStreamChunk {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'iteration', nullable: true, type: 'int' })
  iteration!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne('Plan', 'planOutputChunks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;
}
