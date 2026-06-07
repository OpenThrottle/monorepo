/**
 * @description TypeORM entity for agent_conversation_messages. Matches databases/migrations/051.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AgentConversation } from './agent-conversation.entity';
import type { AgentConversationMessageRole } from './agent-conversation.constants';

export interface AgentConversationMessageData {
  readonly content: string;
  readonly conversationId: string;
  readonly createdAt: Date;
  readonly id: string;
  readonly role: AgentConversationMessageRole;
  readonly routingConfidence: number | null;
  readonly routingModel: string | null;
  readonly routingReason: string | null;
  readonly routingTier: string | null;
  readonly sortOrder: number;
  readonly toolMetadata: Record<string, unknown> | null;
}

@Entity('agent_conversation_messages')
export class AgentConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

  @ManyToOne(() => AgentConversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: AgentConversation;

  @Column({ name: 'role', type: 'text' })
  role!: AgentConversationMessageRole;

  @Column({ name: 'content', type: 'text' })
  content!: string;

  @Column({ name: 'sort_order', type: 'integer' })
  sortOrder!: number;

  @Column({ name: 'routing_tier', nullable: true, type: 'text' })
  routingTier!: string | null;

  @Column({
    name: 'routing_confidence',
    nullable: true,
    type: 'double precision',
  })
  routingConfidence!: number | null;

  @Column({ name: 'routing_model', nullable: true, type: 'text' })
  routingModel!: string | null;

  @Column({ name: 'routing_reason', nullable: true, type: 'text' })
  routingReason!: string | null;

  @Column({ name: 'tool_metadata', nullable: true, type: 'jsonb' })
  toolMetadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
