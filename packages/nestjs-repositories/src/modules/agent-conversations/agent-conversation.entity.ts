/**
 * @description TypeORM entity for agent_conversations. Matches databases/migrations/051.
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
import { Plan } from '../plans/plan.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import type { AgentConversationStatus } from './agent-conversation.constants';

export interface AgentConversationData {
  readonly createdAt: Date;
  readonly id: string;
  readonly metadata: Record<string, unknown> | null;
  readonly modelName: string | null;
  readonly modelProvider: string | null;
  readonly planId: string | null;
  readonly projectId: string | null;
  readonly status: AgentConversationStatus;
  readonly title: string | null;
  readonly updatedAt: Date;
  readonly userId: string;
}

@Entity('agent_conversations')
export class AgentConversation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'title', nullable: true, type: 'text' })
  title!: string | null;

  @Column({ default: 'active', name: 'status', type: 'text' })
  status!: AgentConversationStatus;

  @Column({ name: 'plan_id', nullable: true, type: 'uuid' })
  planId!: string | null;

  @ManyToOne(() => Plan, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'plan_id' })
  plan?: Plan;

  @Column({ name: 'project_id', nullable: true, type: 'uuid' })
  projectId!: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;

  @Column({ name: 'model_provider', nullable: true, type: 'text' })
  modelProvider!: string | null;

  @Column({ name: 'model_name', nullable: true, type: 'text' })
  modelName!: string | null;

  @Column({ name: 'metadata', nullable: true, type: 'jsonb' })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;
}
