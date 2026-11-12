/**
 * @description TypeORM entity for OpenThrottle plan_output_stream table. Matches databases/openthrottle/migrations (007, 077, 156).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { Plan } from '../plans/plan.entity.ts';
import type { Task } from '../tasks/task.entity.ts';
import type { PlanOutputStreamKind } from './plan-output-stream.types.ts';

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

  // Producer tag (migration 156). NULL for untagged chunks and historical rows.
  @Column({ name: 'kind', nullable: true, type: 'text' })
  kind!: PlanOutputStreamKind | null;

  @Column({ name: 'task_id', nullable: true, type: 'uuid' })
  taskId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne('Plan', 'planOutputChunks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  // Nullable task attribution (migration 077). ON DELETE SET NULL: removing a
  // task preserves its output history on the plan stream, just unattributed.
  @ManyToOne('Task', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task | null;
}
