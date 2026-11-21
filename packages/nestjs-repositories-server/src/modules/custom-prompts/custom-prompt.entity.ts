/**
 * @description TypeORM entity for the openthrottle `custom_prompts` table: the agent-asset
 * library (skills, rules, personas, prompts). Extends `BaseModel`, so a delete is a soft delete
 * through `deleted_at`. The unique index on (file_path, prompt_type, user_id) is per owner, with
 * every system row (user_id NULL) one owner (NULLS NOT DISTINCT), so a user's prompt can override
 * a system prompt at the same path. It deliberately still covers soft-deleted rows: the
 * agent-asset ingest upserts `ON CONFLICT … deleted_at = NULL` and revives a prompt whose file
 * reappeared. Matches databases/openthrottle/migrations (036, 179, 190).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { Project } from '../projects/project.entity.ts';
import type { User } from '../users/user.entity.ts';
import type { CustomPromptType } from './custom-prompts.types.ts';

@Entity('custom_prompts')
export class CustomPrompt extends BaseModel {
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

  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @ManyToOne('Project', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;
}
