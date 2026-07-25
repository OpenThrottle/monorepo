/**
 * @description TypeORM entity for OpenThrottle plans table. Matches databases/migrations (002, 012, 014, 022, 055).
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
import type { PlanEmbedding } from '../plan-embeddings/plan-embedding.entity';
import type { PlanOutputStreamChunk } from '../plan-output-stream/plan-output-stream.entity';
import type { Project } from '../projects/project.entity';
import type { Task } from '../tasks/task.entity';
import type {
  PlanJobRunHooksStorage,
  PlanRunConfigStorage,
} from '@openthrottle/openthrottle-plan-config';

/** Scalar/column fields of Plan (no relations). Use this to type GraphQL objects or DTOs that mirror the entity. */
export type PlanData = Pick<
  Plan,
  | 'assignee'
  | 'author'
  | 'category'
  | 'completedAt'
  | 'createdAt'
  | 'description'
  | 'id'
  | 'project'
  | 'projectId'
  | 'status'
  | 'summary'
  | 'title'
  | 'updatedAt'
>;

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({ name: 'author', type: 'text' })
  author!: string;

  @Column({ name: 'category', type: 'text' })
  category!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ default: 'pending', name: 'status', type: 'text' })
  status!: string;

  @Column({ name: 'assignee', nullable: true, type: 'text' })
  assignee!: string | null;

  @Column({ name: 'summary', nullable: true, type: 'text' })
  summary!: string | null;

  @Column({ name: 'project', nullable: true, type: 'text' })
  project!: string | null;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @Column({
    default: () => '\'{"hooks":[]}\'::jsonb',
    name: 'job_run_hooks',
    type: 'jsonb',
  })
  jobRunHooks!: PlanJobRunHooksStorage;

  /** @description Stored shape for `plans.run_config` (validated in openthrottle-server). */
  @Column({
    default: () => '\'{"version":1}\'::jsonb',
    name: 'run_config',
    type: 'jsonb',
  })
  runConfig!: PlanRunConfigStorage;

  /**
   * @description Set once on transition into COMPLETED; cleared if status leaves COMPLETED.
   * Not maintained by DB updated_at triggers — see migration 055.
   */
  @Column({
    name: 'completed_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne('Project', 'plans', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  projectRelation!: Project | null;

  @OneToMany('Task', 'plan')
  tasks!: Task[];

  @OneToMany('PlanEmbedding', 'plan')
  planEmbeddings!: PlanEmbedding[];

  @OneToMany('PlanOutputStreamChunk', 'plan')
  planOutputChunks!: PlanOutputStreamChunk[];
}
