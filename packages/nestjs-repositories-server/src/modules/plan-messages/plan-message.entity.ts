/**
 * @description TypeORM entity for the openthrottle `plan_messages` table (the plan inbox). Extends
 * `BaseHardDeleteModel`: a message is history and is never user-deleted (withdrawing one is a
 * status), so a delete is real (the only deletes are FK cascades from a removed plan). Delivery
 * and edits are written in place, so it declares its own `updated_at`. Matches
 * databases/openthrottle/migrations (144, 176).
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

import type { PlanRun } from '../plan-runs/plan-run.entity.ts';
import type { Plan } from '../plans/plan.entity.ts';
import type { Task } from '../tasks/task.entity.ts';
import type {
  PlanMessageKind,
  PlanMessageStatus,
} from './plan-messages.types.ts';

@Entity('plan_messages')
export class PlanMessage extends BaseHardDeleteModel {
  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'task_id', nullable: true, type: 'uuid' })
  taskId!: string | null;

  @Column({ name: 'kind', type: 'text' })
  kind!: PlanMessageKind;

  @Column({ name: 'author', type: 'text' })
  author!: string;

  @Column({ name: 'body', type: 'text' })
  body!: string;

  @Column({ name: 'status', type: 'text' })
  status!: PlanMessageStatus;

  @Column({ name: 'plan_run_id', nullable: true, type: 'uuid' })
  planRunId!: string | null;

  @Column({
    name: 'delivered_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  deliveredAt!: Date | null;

  @Column({ name: 'delivered_to_task_id', nullable: true, type: 'uuid' })
  deliveredToTaskId!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne('Plan', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;

  @ManyToOne('Task', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task | null;

  @ManyToOne('PlanRun', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_run_id' })
  planRun?: PlanRun | null;

  @ManyToOne('Task', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivered_to_task_id' })
  deliveredToTask?: Task | null;
}
