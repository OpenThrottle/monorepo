/**
 * @description TypeORM entity for the openthrottle `agent_conversations` table: user-scoped
 * persisted chat threads. Extends `BaseModel`: a user deletes a conversation, so a delete is soft
 * (it stamps `deleted_at` and sets `status` to `'deleted'`), and data retention purges it, with
 * its messages, 30 days later. Matches databases/openthrottle/migrations (051, 081, 180).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { Plan } from '../plans/plan.entity.ts';
import type { Project } from '../projects/project.entity.ts';
import type { User } from '../users/user.entity.ts';
import type { AgentConversationStatus } from './agent-conversations.types.ts';

@Entity('agent_conversations')
export class AgentConversation extends BaseModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'title', nullable: true, type: 'text' })
  title!: string | null;

  @Column({ default: 'active', name: 'status', type: 'text' })
  status!: AgentConversationStatus;

  @Column({ name: 'plan_id', nullable: true, type: 'uuid' })
  planId!: string | null;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @Column({ name: 'model_provider', nullable: true, type: 'text' })
  modelProvider!: string | null;

  @Column({ name: 'model_name', nullable: true, type: 'text' })
  modelName!: string | null;

  @Column({ name: 'metadata', nullable: true, type: 'jsonb' })
  metadata!: Record<string, unknown> | null;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ManyToOne('Plan', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan | null;

  @ManyToOne('Project', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project?: Project | null;
}
