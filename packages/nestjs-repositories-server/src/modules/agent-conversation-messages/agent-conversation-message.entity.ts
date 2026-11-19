/**
 * @description TypeORM entity for the openthrottle `agent_conversation_messages` table: one row
 * per persisted chat message, ordered by `sort_order` within its conversation. Extends
 * `BaseHardDeleteModel`: messages are append-only and never deleted on their own. They stay with a
 * soft-deleted conversation and go, through `ON DELETE CASCADE`, when data retention purges it.
 * Matches databases/openthrottle/migrations (051, 180).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { AgentConversation } from '../agent-conversations/agent-conversation.entity.ts';
import type { AgentConversationMessageRole } from './agent-conversation-messages.types.ts';

@Entity('agent_conversation_messages')
export class AgentConversationMessage extends BaseHardDeleteModel {
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId!: string;

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

  @ManyToOne('AgentConversation', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: AgentConversation;
}
