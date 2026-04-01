/**
 * @description TypeORM entity for OpenThrottle custom_prompts table.
 * Matches databases/openthrottle/migrations (036_create_custom_prompts_table.sql).
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
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';

/**
 * @description Strict set of document purposes for custom prompts.
 */
export const CUSTOM_PROMPT_TYPES = [
  'agents',
  'commands',
  'prompts',
  'rules',
  'skills',
] as const;

export type CustomPromptType = (typeof CUSTOM_PROMPT_TYPES)[number];

export interface CustomPromptData {
  readonly content: string;
  readonly description: string | null;
  readonly filePath: string | null;
  readonly labels: string[];
  readonly projectId: string | null;
  readonly promptType: CustomPromptType;
  readonly title: string;
  readonly userId: string | null;
}

@Entity('custom_prompts')
export class CustomPrompt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column({ name: 'title', type: 'text' })
  title!: string;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'prompt_type', type: 'text' })
  promptType!: CustomPromptType;

  @Column({ default: '[]', name: 'labels', type: 'jsonb' })
  labels!: string[];

  @Column({ name: 'file_path', nullable: true, type: 'text' })
  filePath!: string | null;

  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({
    name: 'deleted_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  deletedAt!: Date | null;
}
