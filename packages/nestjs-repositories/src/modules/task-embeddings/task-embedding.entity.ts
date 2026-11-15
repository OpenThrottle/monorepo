/**
 * @description TypeORM entity for OpenThrottle task_embeddings table. Matches databases/openthrottle/migrations (005, 163). Uses pgvector vector(768) with per-row provenance (embedding_model, embedding_dims, content_hash); one row per source row.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { vectorTransformer } from '../../vector-transformer/vector-transformer.constants.ts';
import type { Task } from '../tasks/task.entity.ts';

@Entity('task_embeddings')
export class TaskEmbedding {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({
    name: 'embedding',
    nullable: true,
    transformer: vectorTransformer,
    type: 'vector',
  })
  embedding!: number[] | null;

  @Column({ name: 'embedding_dims', nullable: true, type: 'integer' })
  embeddingDims!: number | null;

  @Column({ name: 'embedding_model', nullable: true, type: 'text' })
  embeddingModel!: string | null;

  @Column({ default: () => "'{}'::jsonb", name: 'metadata', type: 'jsonb' })
  metadata!: Record<string, unknown>;

  @Column({ name: 'content_hash', nullable: true, type: 'text' })
  contentHash!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne('Task', 'taskEmbeddings', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;
}

/**
 * @description Row shape from raw SQL vector search (task_embeddings JOIN tasks JOIN plans). Aligns with {@link TaskEmbedding} id, content, metadata, task_id plus plan_id, plan_title, task_title and similarity from joins/compute.
 */
export interface TaskEmbeddingSearchRow {
  readonly content: string;
  readonly id: string;
  readonly metadata: unknown;
  readonly plan_id: string;
  readonly plan_title: string;
  readonly similarity: string;
  readonly task_id: string;
  readonly task_title: string;
}
