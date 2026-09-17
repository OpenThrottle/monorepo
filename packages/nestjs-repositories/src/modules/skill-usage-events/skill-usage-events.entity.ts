/**
 * @description TypeORM entity for skill_usage_events. Matches
 * databases/migrations/084_create_skill_usage_events.sql, as widened by
 * 114_widen_skill_usage_scope_personal.sql. One immutable row per
 * harness-captured skill invocation (ours, personal and third-party).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Who a captured invocation belongs to. The canonical declaration — enforced
 * in Postgres by `skill_usage_events_scope_check`, mirrored (deliberately, to
 * avoid a React Router app importing from a NestJS package) by
 * `SKILL_USAGE_SCOPES` in
 * `applications/openthrottle-developer/app/routing/usage/data/skill-usage-copy.ts`,
 * and by the `Scope` union in `packages/agentic-hooks/src/types.ts` which the
 * capture hooks bundle. Widening the vocabulary means touching all three.
 *
 * `personal` = authored by the invoking user under their personal skills root
 * (`~/.openthrottle/skills` / `OPENTHROTTLE_PERSONAL_SKILLS_DIR`): on disk and
 * invokable, but outside the repo, so nobody else's checkout has it.
 *
 * Distinct from the `/agents` registry provenance vocabulary
 * (`committed | installed | external`), which answers where the file came from
 * rather than who the invocation belongs to. The two are deliberately not
 * unified.
 */
export const SKILL_USAGE_SCOPES = {
  OURS: 'ours',
  PERSONAL: 'personal',
  THIRD_PARTY: 'third-party',
} as const;

export type SkillUsageScope =
  (typeof SKILL_USAGE_SCOPES)[keyof typeof SKILL_USAGE_SCOPES];

const SKILL_USAGE_SCOPE_VALUES: readonly string[] =
  Object.values(SKILL_USAGE_SCOPES);

/**
 * Type predicate over {@link SKILL_USAGE_SCOPES}, derived from the const so a
 * new member widens every caller for free. The canonical one — the resolver
 * and the repository service both use this rather than hand-rolling a chain of
 * `===` comparisons that silently stops matching when the vocabulary grows.
 *
 * @public
 */
export const isSkillUsageScope = (value: string): value is SkillUsageScope =>
  SKILL_USAGE_SCOPE_VALUES.includes(value);

/**
 * Human-readable member list for validation messages, e.g.
 * `scope must be one of: ours, personal, third-party`. Generated from the
 * const so an error message can never name a stale vocabulary.
 *
 * @public
 */
export const SKILL_USAGE_SCOPE_LIST = SKILL_USAGE_SCOPE_VALUES.join(', ');

/**
 * The per-day aggregate column each scope counts into. Exhaustive over the
 * scope union on purpose: this `Record` is the gate that makes adding a fourth
 * member a compile error here instead of a silently dropped series in the
 * chart, which is exactly how `personal` went uncounted.
 *
 * @public
 */
export const SKILL_USAGE_SCOPE_COUNT_KEYS = {
  [SKILL_USAGE_SCOPES.OURS]: 'oursCount',
  [SKILL_USAGE_SCOPES.PERSONAL]: 'personalCount',
  [SKILL_USAGE_SCOPES.THIRD_PARTY]: 'thirdPartyCount',
} as const satisfies Record<SkillUsageScope, string>;

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

  /**
   * Instrumentation probe from telemetry bring-up, not real usage. A closed
   * historical set; /usage excludes these so they stop inflating counts. See
   * migration 115.
   */
  @Column({ default: false, name: 'is_fixture', type: 'boolean' })
  isFixture!: boolean;
}
