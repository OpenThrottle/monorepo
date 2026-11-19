/**
 * @description TypeORM entity for the openthrottle `agent_token_usage` table: one immutable row
 * per persisted assistant turn (normalized token and cost usage). Extends `BaseHardDeleteModel`:
 * the table is an append-only log that data retention deletes by age, so a delete is real.
 * Matches databases/openthrottle/migrations (083, 135, 158, 161, 180).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { AgentAccount } from '../agent-accounts/agent-account.entity.ts';
import type { AgentConversationMessage } from '../agent-conversation-messages/agent-conversation-message.entity.ts';
import type { AgentConversation } from '../agent-conversations/agent-conversation.entity.ts';
import type { User } from '../users/user.entity.ts';

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

@Entity('agent_token_usage')
export class AgentTokenUsage extends BaseHardDeleteModel {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'agent_account_id', nullable: true, type: 'uuid' })
  agentAccountId!: string | null;

  @ManyToOne('AgentAccount', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_account_id' })
  agentAccount?: AgentAccount | null;

  @Column({ name: 'conversation_id', nullable: true, type: 'uuid' })
  conversationId!: string | null;

  @ManyToOne('AgentConversation', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: AgentConversation | null;

  @Column({ name: 'message_id', nullable: true, type: 'uuid' })
  messageId!: string | null;

  @ManyToOne('AgentConversationMessage', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'message_id' })
  message?: AgentConversationMessage | null;

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

  @Column({ name: 'source', nullable: true, type: 'text' })
  source!: string | null;

  @Column({ name: 'session_id', nullable: true, type: 'text' })
  sessionId!: string | null;

  @Column({ name: 'request_id', nullable: true, type: 'text' })
  requestId!: string | null;

  /**
   * @description Raw working directory. Deprecated in favour of
   * {@link AgentTokenUsage.repoIdentity}; foreign-repo senders send null
   * (docs/monorepo/child-repo-hook-telemetry-contract.md §3).
   */
  @Column({ name: 'cwd', nullable: true, type: 'text' })
  cwd!: string | null;

  /** Normalized https git remote, or null — never a filesystem path. */
  @Column({ name: 'repo_identity', nullable: true, type: 'text' })
  repoIdentity!: string | null;

  @Column({ name: 'git_branch', nullable: true, type: 'text' })
  gitBranch!: string | null;
}
