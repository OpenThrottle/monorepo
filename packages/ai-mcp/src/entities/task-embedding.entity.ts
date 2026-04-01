/**
 * @description TypeORM entity for Cortex task_embeddings table. Matches databases/cortex/migrations (005). Uses pgvector vector(1536).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { vectorTransformer } from './vector.transformer.js';
import type { Task } from './task.entity.js';

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
