/**
 * @description TypeORM entity for Cortex task_embeddings table. Matches databases/migrations (005). Uses pgvector vector(1536).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { vectorTransformer } from '../../common/vector.transformer';
import type { Task } from '../tasks/task.entity';

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

  @Column({ default: () => "'{}'::jsonb", name: 'metadata', type: 'jsonb' })
  metadata!: Record<string, unknown>;

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
