/**
 * @description TypeORM entity for the openthrottle `task_embeddings` table. Extends
 * `BaseHardDeleteModel`: embeddings are derived rows, so a delete is real. Matches
 * databases/openthrottle/migrations (005, 163, 173). Uses pgvector vector(768) with per-row
 * provenance (embedding_model, embedding_dims, content_hash); one row per source row.
 * @public
 */

import {
  BaseHardDeleteModel,
  vectorTransformer,
} from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { Task } from '../tasks/task.entity.ts';

@Entity('task_embeddings')
export class TaskEmbedding extends BaseHardDeleteModel {
  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'content_hash', nullable: true, type: 'text' })
  contentHash!: string | null;

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

  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @ManyToOne('Task', 'taskEmbeddings', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: Task;
}
