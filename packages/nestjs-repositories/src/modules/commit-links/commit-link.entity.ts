/**
 * @description TypeORM entity for Cortex commit_links table. Matches databases/cortex/migrations (006).
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
import type { Task } from '../tasks/task.entity';

@Entity('commit_links')
export class CommitLink {
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'message', nullable: true, type: 'text' })
  message!: string | null;

  @ManyToOne('Plan', 'commitLinks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'repo', type: 'text' })
  repo!: string;

  @Column({ name: 'sha', type: 'text' })
  sha!: string;

  @ManyToOne('Task', 'commitLinks', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task | null;

  @Column({ name: 'task_id', nullable: true, type: 'uuid' })
  taskId!: string | null;
}
