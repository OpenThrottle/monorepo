/**
 * @description TypeORM entity for skill_usage_outcomes. Opt-in outcome/duration enrichment
 * for skills we author — correlated to skill_usage_events by session_id + skill_name.
 * Append-only, so it extends `BaseHardDeleteModel` (no soft delete). `receivedAt` (server
 * receipt time, filled by the database default) and `occurredAt` (client time) stay its own
 * columns beside the base `createdAt`, which migration 170 backfilled from `received_at`.
 * Matches databases/openthrottle/migrations (085, 103, 104, 112, 114, 123, 124, 153, 154,
 * 170).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

import { SKILL_USAGE_SCOPES } from '../skill-usage-events/skill-usage-events.constants.ts';
import type { SkillUsageScope } from '../skill-usage-events/skill-usage-events.types.ts';
import { SKILL_USAGE_CAPTURE_MODELS } from './skill-usage-outcomes.constants.ts';
import type {
  SkillUsageCaptureModel,
  SkillUsageOutcomeValue,
} from './skill-usage-outcomes.types.ts';

@Entity('skill_usage_outcomes')
export class SkillUsageOutcome extends BaseHardDeleteModel {
  @Column({ name: 'skill_name', type: 'text' })
  skillName!: string;

  @Column({ name: 'session_id', nullable: true, type: 'text' })
  sessionId!: string | null;

  @Column({ name: 'tool_use_id', nullable: true, type: 'text' })
  toolUseId!: string | null;

  @Column({ name: 'outcome', type: 'text' })
  outcome!: SkillUsageOutcomeValue;

  @Column({
    default: SKILL_USAGE_CAPTURE_MODELS.REPORTED_V1,
    name: 'capture_model',
    type: 'text',
  })
  captureModel!: SkillUsageCaptureModel;

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

  @Column({ name: 'source', nullable: true, type: 'text' })
  source!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamp with time zone' })
  occurredAt!: Date;

  /**
   * Server receipt time, filled by the column's `now()` default. Not a
   * `@CreateDateColumn`: the base `createdAt` already is one.
   */
  @Column({
    default: () => 'now()',
    name: 'received_at',
    type: 'timestamp with time zone',
  })
  receivedAt!: Date;
}
