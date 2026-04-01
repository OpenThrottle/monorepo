/**
 * @description TypeORM entity for Cortex plans table. Matches databases/cortex/migrations (002, 012, 014, 022).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { CommitLink } from './commit-link.entity.js';
import type { PlanEmbedding } from './plan-embedding.entity.js';
import type { PlanOutputStreamChunk } from './plan-output-stream.entity.js';
import type { Task } from './task.entity.js';

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

  @Column({ default: 'PENDING', name: 'status', type: 'text' })
  status!: string;

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

  @OneToMany('Task', 'plan')
  tasks!: Task[];

  @OneToMany('PlanEmbedding', 'plan')
  planEmbeddings!: PlanEmbedding[];

  @OneToMany('CommitLink', 'plan')
  commitLinks!: CommitLink[];

  @OneToMany('PlanOutputStreamChunk', 'plan')
  planOutputChunks!: PlanOutputStreamChunk[];
}
