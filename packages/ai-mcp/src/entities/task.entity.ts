/**
 * @description TypeORM entity for Cortex tasks table. Matches databases/cortex/migrations (003, 012, 015, 023).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Plan } from './plan.entity.js';
import type { TaskEmbedding } from './task-embedding.entity.js';
import type { CommitLink } from './commit-link.entity.js';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId!: string;

  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'category', nullable: true, type: 'text' })
  category!: string | null;

  @Column({ default: 'PENDING', name: 'status', type: 'text' })
  status!: string;

  @Column({ default: () => "'[]'::jsonb", name: 'requirements', type: 'jsonb' })
  requirements!: unknown[];

  @Column({ name: 'assignee', nullable: true, type: 'text' })
  assignee!: string | null;

  @Column({ name: 'summary', nullable: true, type: 'text' })
  summary!: string | null;

  @Column({ name: 'project', nullable: true, type: 'text' })
  project!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne('Plan', 'tasks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @OneToMany('TaskEmbedding', 'task')
  taskEmbeddings!: TaskEmbedding[];

  @OneToMany('CommitLink', 'task')
  commitLinks!: CommitLink[];
}
