/**
 * @description TypeORM entity for skill_usage_outcomes. Matches
 * databases/migrations/085_create_skill_usage_outcomes.sql. Opt-in
 * outcome/duration enrichment for skills we author — correlated to
 * skill_usage_events by session_id + skill_name.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  SKILL_USAGE_SCOPES,
  type SkillUsageScope,
} from './skill-usage-events.entity';

export const SKILL_USAGE_OUTCOMES = {
  ABANDONED: 'abandoned',
  ERROR: 'error',
  SUCCESS: 'success',
} as const;

export type SkillUsageOutcomeValue =
  (typeof SKILL_USAGE_OUTCOMES)[keyof typeof SKILL_USAGE_OUTCOMES];

export interface SkillUsageOutcomeData {
  readonly cwd: string | null;
  readonly durationMs: number | null;
  readonly gitBranch: string | null;
  readonly id: string;
  readonly occurredAt: Date;
  readonly outcome: SkillUsageOutcomeValue;
  readonly receivedAt: Date;
  readonly scope: SkillUsageScope;
  readonly sessionId: string | null;
  readonly skillName: string;
  readonly toolUseId: string | null;
}

@Entity('skill_usage_outcomes')
export class SkillUsageOutcome {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'skill_name', type: 'text' })
  skillName!: string;

  @Column({ name: 'session_id', nullable: true, type: 'text' })
  sessionId!: string | null;

  @Column({ name: 'tool_use_id', nullable: true, type: 'text' })
  toolUseId!: string | null;

  @Column({ name: 'outcome', type: 'text' })
  outcome!: SkillUsageOutcomeValue;

  @Column({ name: 'duration_ms', nullable: true, type: 'integer' })
  durationMs!: number | null;

  @Column({ name: 'cwd', nullable: true, type: 'text' })
  cwd!: string | null;

  @Column({ name: 'git_branch', nullable: true, type: 'text' })
  gitBranch!: string | null;

  @Column({
    default: SKILL_USAGE_SCOPES.OURS,
    name: 'scope',
    type: 'text',
  })
  scope!: SkillUsageScope;

  @Column({ name: 'occurred_at', type: 'timestamp with time zone' })
  occurredAt!: Date;

  @CreateDateColumn({ name: 'received_at', type: 'timestamp with time zone' })
  receivedAt!: Date;
}
