/**
 * @description TypeORM entity for skill_usage_events. Matches
 * databases/migrations/084_create_skill_usage_events.sql. One immutable row
 * per harness-captured skill invocation (ours + third-party).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const SKILL_USAGE_SCOPES = {
  OURS: 'ours',
  THIRD_PARTY: 'third-party',
} as const;

export type SkillUsageScope =
  (typeof SKILL_USAGE_SCOPES)[keyof typeof SKILL_USAGE_SCOPES];

export const SKILL_USAGE_PRIVACY_LEVELS = {
  FULL: 'full',
  NAME_ONLY: 'name-only',
  TRUNCATED: 'truncated',
} as const;

export type SkillUsagePrivacyLevel =
  (typeof SKILL_USAGE_PRIVACY_LEVELS)[keyof typeof SKILL_USAGE_PRIVACY_LEVELS];

export interface SkillUsageEventData {
  readonly agentId: string | null;
  readonly agentType: string | null;
  readonly args: string | null;
  readonly cwd: string | null;
  readonly gitBranch: string | null;
  readonly hookEventName: string | null;
  readonly id: string;
  readonly invocationPath: string | null;
  readonly occurredAt: Date;
  readonly privacyLevel: SkillUsagePrivacyLevel;
  readonly promptId: string | null;
  readonly receivedAt: Date;
  readonly scope: SkillUsageScope;
  readonly sessionId: string | null;
  readonly skillName: string;
  readonly source: string | null;
  readonly toolUseId: string | null;
  readonly userId: string | null;
}

@Entity('skill_usage_events')
export class SkillUsageEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'skill_name', type: 'text' })
  skillName!: string;

  @Column({ name: 'args', nullable: true, type: 'text' })
  args!: string | null;

  @Column({ name: 'session_id', nullable: true, type: 'text' })
  sessionId!: string | null;

  @Column({ name: 'cwd', nullable: true, type: 'text' })
  cwd!: string | null;

  @Column({ name: 'git_branch', nullable: true, type: 'text' })
  gitBranch!: string | null;

  @Column({ name: 'scope', type: 'text' })
  scope!: SkillUsageScope;

  @Column({ name: 'source', nullable: true, type: 'text' })
  source!: string | null;

  @Column({ name: 'invocation_path', nullable: true, type: 'text' })
  invocationPath!: string | null;

  @Column({
    default: SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED,
    name: 'privacy_level',
    type: 'text',
  })
  privacyLevel!: SkillUsagePrivacyLevel;

  @Column({ name: 'agent_id', nullable: true, type: 'text' })
  agentId!: string | null;

  @Column({ name: 'agent_type', nullable: true, type: 'text' })
  agentType!: string | null;

  @Column({ name: 'tool_use_id', nullable: true, type: 'text' })
  toolUseId!: string | null;

  @Column({ name: 'prompt_id', nullable: true, type: 'text' })
  promptId!: string | null;

  @Column({ name: 'hook_event_name', nullable: true, type: 'text' })
  hookEventName!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamp with time zone' })
  occurredAt!: Date;

  @CreateDateColumn({ name: 'received_at', type: 'timestamp with time zone' })
  receivedAt!: Date;

  /**
   * The human user this invocation is attributed to, resolved server-side at
   * ingest from the authenticated principal. Null means no principal
   * resolved (or the row predates migration 110) — never that no one ran it.
   * Never populated from a client-supplied value, and never backfilled by
   * heuristic. Consumers fall back to the cwd/git_branch heuristic when null.
   */
  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null;
}
