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
import type { CommitLink } from '../commit-links/commit-link.entity';
import type { Plan } from '../plans/plan.entity';
import type { Project } from '../projects/project.entity';
import type { TaskEmbedding } from '../task-embeddings/task-embedding.entity';

/** Scalar/column fields of Task (no relations). Use this to type GraphQL objects or DTOs that mirror the entity. */
export type TaskData = Pick<
  Task,
  | 'assignee'
  | 'category'
  | 'createdAt'
  | 'description'
  | 'id'
  | 'planId'
  | 'project'
  | 'projectId'
  | 'requirements'
  | 'status'
  | 'summary'
  | 'title'
  | 'updatedAt'
>;

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

  @Column({ default: 'pending', name: 'status', type: 'text' })
  status!: string;

  @Column({ default: () => "'[]'::jsonb", name: 'requirements', type: 'jsonb' })
  requirements!: unknown[];

  @Column({ name: 'assignee', nullable: true, type: 'text' })
  assignee!: string | null;

  @Column({ name: 'summary', nullable: true, type: 'text' })
  summary!: string | null;

  @Column({ name: 'project', nullable: true, type: 'text' })
  project!: string | null;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne('Plan', 'tasks', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @ManyToOne('Project', 'tasks', { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  projectRelation!: Project | null;

  @OneToMany('TaskEmbedding', 'task')
  taskEmbeddings!: TaskEmbedding[];

  @OneToMany('CommitLink', 'task')
  commitLinks!: CommitLink[];
}
