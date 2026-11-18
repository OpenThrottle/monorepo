import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { SkillUsageScope } from '../skill-usage-events/skill-usage-events.types.ts';
import type { SkillUsageOutcome } from './skill-usage-outcome.entity.ts';
import type {
  SKILL_USAGE_CAPTURE_MODELS,
  SKILL_USAGE_OUTCOMES,
} from './skill-usage-outcomes.constants.ts';
import type { SkillUsageOutcomesRepository } from './skill-usage-outcomes.repository.ts';

/**
 * @description One outcome a skill invocation can report; see {@link SKILL_USAGE_OUTCOMES}.
 * @public
 */
export type SkillUsageOutcomeValue =
  (typeof SKILL_USAGE_OUTCOMES)[keyof typeof SKILL_USAGE_OUTCOMES];

/**
 * @description Which capture contract wrote an outcome row; see
 * {@link SKILL_USAGE_CAPTURE_MODELS}.
 * @public
 */
export type SkillUsageCaptureModel =
  (typeof SKILL_USAGE_CAPTURE_MODELS)[keyof typeof SKILL_USAGE_CAPTURE_MODELS];

/**
 * @description Plain-object shape of a skill_usage_outcomes row.
 * @public
 */
export interface SkillUsageOutcomeData {
  readonly captureModel: SkillUsageCaptureModel;
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
  readonly source: string | null;
  readonly toolUseId: string | null;
}

/**
 * @description Opt-in outcome enrichment for a skill we author. Correlates to a start
 * event via sessionId + skillName (and optionally toolUseId).
 * @public
 */
export interface RecordSkillUsageOutcomeInput {
  readonly cwd?: string | null;
  /**
   * True when the sender is a deliberate reporter. A `success`/`error` claim
   * without it is stored as `legacy_assumed_success` (a stale pre-#537 bundle
   * hardcoded `success`); `session_ended`/`abandoned` make no quality claim
   * and are always `reported_v1`.
   */
  readonly deliberate?: boolean | null;
  readonly durationMs?: number | null;
  readonly gitBranch?: string | null;
  readonly occurredAt: Date;
  readonly outcome: SkillUsageOutcomeValue;
  readonly scope?: SkillUsageScope;
  readonly sessionId?: string | null;
  readonly skillName: string;
  readonly source?: string | null;
  readonly toolUseId?: string | null;
}

/**
 * @description A {@link SkillUsageOutcomesRepository} mock: every inherited
 * `BaseRepository` method plus the skill-usage-outcomes ones.
 * @public
 */
export interface SkillUsageOutcomesRepositoryMock extends BaseRepositoryMock<
  SkillUsageOutcome,
  CreateModelInput<SkillUsageOutcome>
> {
  readonly recordSkillUsageOutcome: Mock<
    SkillUsageOutcomesRepository['recordSkillUsageOutcome']
  >;
}
