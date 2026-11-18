/**
 * @description TypeORM entity for skill_usage_events. One immutable row per
 * harness-captured skill invocation (ours, personal and third-party), so it extends
 * `BaseHardDeleteModel` (append-only, no soft delete). `receivedAt` (server receipt time,
 * filled by the database default) and `occurredAt` (client time) stay its own columns
 * beside the base `createdAt`, which migration 170 backfilled from `received_at`.
 * Matches databases/openthrottle/migrations (084, 086, 103, 104, 110, 114, 125, 134,
 * 135, 153, 154, 161, 162, 170).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity } from 'typeorm';

import { SKILL_USAGE_PRIVACY_LEVELS } from './skill-usage-events.constants.ts';
import type {
  SkillUsagePrivacyLevel,
  SkillUsageScope,
} from './skill-usage-events.types.ts';

@Entity('skill_usage_events')
export class SkillUsageEvent extends BaseHardDeleteModel {
  @Column({ name: 'skill_name', type: 'text' })
  skillName!: string;

  @Column({ name: 'args', nullable: true, type: 'text' })
  args!: string | null;

  @Column({ name: 'session_id', nullable: true, type: 'text' })
  sessionId!: string | null;

  /**
   * @description Raw working directory. Deprecated in favour of
   * {@link SkillUsageEvent.repoIdentity}; foreign-repo senders send null
   * (docs/monorepo/child-repo-hook-telemetry-contract.md §3).
   */
  @Column({ name: 'cwd', nullable: true, type: 'text' })
  cwd!: string | null;

  /** Normalized https git remote, or null — never a filesystem path. */
  @Column({ name: 'repo_identity', nullable: true, type: 'text' })
  repoIdentity!: string | null;

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

  /**
   * The human user this invocation is attributed to, resolved server-side at
   * ingest from the authenticated principal. Null means no principal
   * resolved (or the row predates migration 110) — never that no one ran it.
   * Never populated from a client-supplied value, and never backfilled by
   * heuristic. Consumers fall back to the cwd/git_branch heuristic when null.
   */
  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId!: string | null;

  /**
   * Instrumentation probe from telemetry bring-up, not real usage. A closed
   * historical set; /usage excludes these so they stop inflating counts. See
   * migration 115.
   */
  @Column({ default: false, name: 'is_fixture', type: 'boolean' })
  isFixture!: boolean;

  /**
   * Set when this row duplicates another capture of the same invocation (two
   * hook registrations firing at once), pointing at the row that survives.
   * Historic twins were flagged, not deleted; /usage excludes them. New
   * duplicates are refused at insert instead. See migration 134.
   */
  @Column({ name: 'duplicate_of_id', nullable: true, type: 'uuid' })
  duplicateOfId!: string | null;
}
