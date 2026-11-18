import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { SKILL_USAGE_SCOPES } from '../skill-usage-events/skill-usage-events.constants.ts';
import { SkillUsageOutcome } from './skill-usage-outcome.entity.ts';
import {
  SKILL_USAGE_CAPTURE_MODELS,
  SKILL_USAGE_OUTCOMES,
} from './skill-usage-outcomes.constants.ts';
import type { RecordSkillUsageOutcomeInput } from './skill-usage-outcomes.types.ts';

/**
 * @description Data access for the openthrottle `skill_usage_outcomes` table on the
 * default connection: opt-in outcome/duration enrichment for skills we author. The
 * `BaseRepository` CRUD (hard deletes) plus the ingest write. The per-skill outcome
 * aggregates the Usage leaderboard shows are read by `SkillUsageEventsRepository`,
 * which owns that join.
 * @public
 */
@Injectable()
export class SkillUsageOutcomesRepository extends BaseRepository<
  SkillUsageOutcome,
  CreateModelInput<SkillUsageOutcome>
> {
  protected readonly tableName = 'skill_usage_outcomes';

  constructor(
    @InjectRepository(SkillUsageOutcome)
    repository: Repository<SkillUsageOutcome>,
  ) {
    super(repository);
  }

  /**
   * @description Insert one opt-in outcome enrichment event. Correlates to a start
   * via sessionId + skillName (toolUseId optional). Absence of an outcome for a
   * start is a valid state.
   */
  async recordSkillUsageOutcome(
    input: RecordSkillUsageOutcomeInput,
  ): Promise<SkillUsageOutcome> {
    const makesQualityClaim =
      input.outcome === SKILL_USAGE_OUTCOMES.SUCCESS ||
      input.outcome === SKILL_USAGE_OUTCOMES.ERROR;
    // Set explicitly: the column DEFAULT is `reported_v1`, so leaving it to
    // the database would stamp a stale hook's hardcoded success as a report.
    const isUndeclaredClaim = makesQualityClaim && input.deliberate !== true;
    const captureModel = isUndeclaredClaim
      ? SKILL_USAGE_CAPTURE_MODELS.LEGACY_ASSUMED_SUCCESS
      : SKILL_USAGE_CAPTURE_MODELS.REPORTED_V1;
    const row = this.repository.create({
      captureModel,
      cwd: input.cwd ?? null,
      durationMs: input.durationMs ?? null,
      gitBranch: input.gitBranch ?? null,
      occurredAt: input.occurredAt,
      outcome: input.outcome,
      // Legacy default for two-member senders. Every current hook posts an
      // explicit scope from detectScope, including `personal`; this only
      // catches an older child repo that predates the field. See
      // docs/monorepo/child-repo-hook-telemetry-contract.md.
      scope: input.scope ?? SKILL_USAGE_SCOPES.OURS,
      sessionId: input.sessionId ?? null,
      skillName: input.skillName,
      source: input.source ?? null,
      toolUseId: input.toolUseId ?? null,
    });

    return this.repository.save(row);
  }
}
