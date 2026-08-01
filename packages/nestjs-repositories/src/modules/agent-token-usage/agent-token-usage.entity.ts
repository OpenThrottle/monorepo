/**
 * @description TypeORM entity for agent_token_usage. Matches databases/migrations/083.
 * One immutable row per persisted assistant turn (normalized token/cost usage).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AgentConversationMessage } from '../agent-conversations/agent-conversation-message.entity';
import { AgentConversation } from '../agent-conversations/agent-conversation.entity';
import { User } from '../users/user.entity';

/**
 * Postgres returns bigint/numeric as strings (to avoid precision loss). Token
 * counts and costs here fit comfortably in JS numbers, so read them back as
 * `number | null` for ergonomic downstream use.
 */
const nullableNumberColumn = {
  from: (value: string | null): number | null =>
    value == null ? null : Number(value),
  to: (value: number | null): number | null => value,
};

export interface AgentTokenUsageData {
  readonly cachedReadTokens: number | null;
  readonly cachedWriteTokens: number | null;
  readonly conversationId: string | null;
  readonly costUsd: number | null;
  readonly createdAt: Date;
  readonly id: string;
  readonly inputTokens: number | null;
  readonly messageId: string | null;
  readonly model: string | null;
  readonly outputTokens: number | null;
  readonly provider: string;
  readonly rawUsage: Record<string, unknown> | null;
  readonly reasoningTokens: number | null;
  readonly totalTokens: number | null;
  readonly userId: string;
}

@Entity('agent_token_usage')
export class AgentTokenUsage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'conversation_id', nullable: true, type: 'uuid' })
  conversationId!: string | null;

  @ManyToOne(() => AgentConversation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: AgentConversation;

  @Column({ name: 'message_id', nullable: true, type: 'uuid' })
  messageId!: string | null;

  @ManyToOne(() => AgentConversationMessage, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'message_id' })
  message?: AgentConversationMessage;

  @Column({ name: 'provider', type: 'text' })
  provider!: string;

  @Column({ name: 'model', nullable: true, type: 'text' })
  model!: string | null;

  @Column({
    name: 'input_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  inputTokens!: number | null;

  @Column({
    name: 'output_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  outputTokens!: number | null;

  @Column({
    name: 'cached_read_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  cachedReadTokens!: number | null;

  @Column({
    name: 'cached_write_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  cachedWriteTokens!: number | null;

  @Column({
    name: 'reasoning_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  reasoningTokens!: number | null;

  @Column({
    name: 'total_tokens',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'bigint',
  })
  totalTokens!: number | null;

  @Column({
    name: 'cost_usd',
    nullable: true,
    transformer: nullableNumberColumn,
    type: 'numeric',
  })
  costUsd!: number | null;

  @Column({ name: 'raw_usage', nullable: true, type: 'jsonb' })
  rawUsage!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
