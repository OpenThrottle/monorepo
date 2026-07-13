/**
 * @description TypeORM entity for task_tags. Matches databases/migrations/064.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Task } from '../tasks/task.entity';
import type { TagSource } from './tag-provenance';

export interface TaskTagData {
  readonly confidence: number | null;
  readonly dimension: string;
  readonly id: string;
  readonly source: TagSource;
  readonly tag: string;
  readonly taskId: string;
}

@Entity('task_tags')
export class TaskTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task?: Task;

  @Column({ name: 'tag', type: 'text' })
  tag!: string;

  @Column({ name: 'dimension', type: 'text' })
  dimension!: string;

  @Column({ name: 'source', type: 'text' })
  source!: TagSource;

  @Column({
    name: 'confidence',
    nullable: true,
    transformer: {
      from: (value: string | null): number | null =>
        value == null ? null : Number(value),
      to: (value: number | null): number | null => value,
    },
    type: 'numeric',
  })
  confidence!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
