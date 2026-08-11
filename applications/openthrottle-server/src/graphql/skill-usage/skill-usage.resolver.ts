/**
 * @description GraphQL resolver for skill usage ingest + aggregation.
 * Persists harness-captured Skill invocations (ours + third-party), opt-in
 * outcome enrichment for authored skills, and serves the Developer Usage
 * surface. Args are stored as-sent; the server never re-expands
 * truncated/redacted payloads.
 */

import {
  SKILL_USAGE_OUTCOMES,
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
  SkillUsageEventsService,
  type SkillUsageOutcomeValue,
  type SkillUsagePrivacyLevel,
  type SkillUsageScope,
} from '@openthrottle/nestjs-repositories';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import {
  RecordSkillUsageInput,
  RecordSkillUsageOutcomeInput,
} from './skill-usage.input';
import {
  toSkillUsageEventObject,
  toSkillUsageOutcomeObject,
  toSkillUsageResultObject,
} from './skill-usage.mapper';
import {
  SkillUsageEventObject,
  SkillUsageOutcomeObject,
  SkillUsageResultObject,
} from './skill-usage.object';

const isSkillUsageScope = (value: string): value is SkillUsageScope =>
  value === SKILL_USAGE_SCOPES.OURS || value === SKILL_USAGE_SCOPES.THIRD_PARTY;

const isSkillUsagePrivacyLevel = (
  value: string,
): value is SkillUsagePrivacyLevel =>
  value === SKILL_USAGE_PRIVACY_LEVELS.FULL ||
  value === SKILL_USAGE_PRIVACY_LEVELS.NAME_ONLY ||
  value === SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED;

const isSkillUsageOutcome = (value: string): value is SkillUsageOutcomeValue =>
  value === SKILL_USAGE_OUTCOMES.ABANDONED ||
  value === SKILL_USAGE_OUTCOMES.ERROR ||
  value === SKILL_USAGE_OUTCOMES.SUCCESS;

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

const assertYyyyMmDd = (label: string, value: string): void => {
  if (!YYYY_MM_DD.test(value)) {
    throw new BadRequestException(`${label} must be YYYY-MM-DD`);
  }
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc)
// Ingest: service accounts (ot_sa_…) and human JWTs both work; Phase 2b hook
// / Phase 4 outcome helper post with OPENTHROTTLE_MCP_AUTH_TOKEN. Aggregation
// query: SETTINGS_READ (mirrors tokenUsage).
@Resolver(() => SkillUsageEventObject)
export class SkillUsageResolver {
  constructor(
    private readonly skillUsageEventsService: SkillUsageEventsService,
  ) {}

  @Mutation(() => SkillUsageEventObject, {
    description: `Record one harness-captured skill invocation. Args must already be privacy-processed by the client; the server stores them as-sent.`,
  })
  async recordSkillUsage(
    @Args('input', { type: () => RecordSkillUsageInput })
    input: RecordSkillUsageInput,
  ): Promise<SkillUsageEventObject> {
    const skillName = input.skillName?.trim();
    if (!skillName) {
      throw new BadRequestException('skillName is required');
    }

    if (!isSkillUsageScope(input.scope)) {
      throw new BadRequestException(
        `scope must be "${SKILL_USAGE_SCOPES.OURS}" or "${SKILL_USAGE_SCOPES.THIRD_PARTY}"`,
      );
    }

    const privacyLevelRaw =
      input.privacyLevel?.trim() || SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED;
    if (!isSkillUsagePrivacyLevel(privacyLevelRaw)) {
      throw new BadRequestException(
        `privacyLevel must be one of: ${Object.values(SKILL_USAGE_PRIVACY_LEVELS).join(', ')}`,
      );
    }

    const occurredAt =
      input.occurredAt instanceof Date
        ? input.occurredAt
        : new Date(input.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid date');
    }

    const saved = await this.skillUsageEventsService.recordSkillUsage({
      agentId: input.agentId ?? null,
      agentType: input.agentType ?? null,
      args: input.args ?? null,
      cwd: input.cwd ?? null,
      gitBranch: input.gitBranch ?? null,
      hookEventName: input.hookEventName ?? null,
      invocationPath: input.invocationPath ?? null,
      occurredAt,
      privacyLevel: privacyLevelRaw,
      promptId: input.promptId ?? null,
      scope: input.scope,
      sessionId: input.sessionId ?? null,
      skillName,
      source: input.source?.trim() || null,
      toolUseId: input.toolUseId ?? null,
    });

    return toSkillUsageEventObject(saved);
  }

  @Mutation(() => SkillUsageOutcomeObject, {
    description: `Record one opt-in outcome/duration enrichment for a skill we author. Correlates to a harness start by sessionId + skillName. Additive to PreToolUse capture — never a replacement. Missing outcomes are a valid state.`,
  })
  async recordSkillUsageOutcome(
    @Args('input', { type: () => RecordSkillUsageOutcomeInput })
    input: RecordSkillUsageOutcomeInput,
  ): Promise<SkillUsageOutcomeObject> {
    const skillName = input.skillName?.trim();
    if (!skillName) {
      throw new BadRequestException('skillName is required');
    }

    const outcomeRaw = input.outcome?.trim() ?? '';
    if (!isSkillUsageOutcome(outcomeRaw)) {
      throw new BadRequestException(
        `outcome must be one of: ${Object.values(SKILL_USAGE_OUTCOMES).join(', ')}`,
      );
    }

    let resolvedScope: SkillUsageScope = SKILL_USAGE_SCOPES.OURS;
    if (input.scope != null && input.scope !== '') {
      if (!isSkillUsageScope(input.scope)) {
        throw new BadRequestException(
          `scope must be "${SKILL_USAGE_SCOPES.OURS}" or "${SKILL_USAGE_SCOPES.THIRD_PARTY}"`,
        );
      }
      resolvedScope = input.scope;
    }

    if (
      input.durationMs != null &&
      (!Number.isFinite(input.durationMs) || input.durationMs < 0)
    ) {
      throw new BadRequestException('durationMs must be a non-negative number');
    }

    const occurredAt =
      input.occurredAt instanceof Date
        ? input.occurredAt
        : new Date(input.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid date');
    }

    const saved = await this.skillUsageEventsService.recordSkillUsageOutcome({
      cwd: input.cwd ?? null,
      durationMs: input.durationMs ?? null,
      gitBranch: input.gitBranch ?? null,
      occurredAt,
      outcome: outcomeRaw,
      scope: resolvedScope,
      sessionId: input.sessionId ?? null,
      skillName,
      toolUseId: input.toolUseId ?? null,
    });

    return toSkillUsageOutcomeObject(saved);
  }

  @Query(() => SkillUsageResultObject, {
    description: `Aggregated skill usage over [start, end] (inclusive YYYY-MM-DD, UTC): top skills (with opt-in outcome stats), ours-vs-third-party split, per-day series, and branch/cwd filter options. Optional scope/gitBranch/cwd/skillName narrow the aggregates.`,
  })
  @UseGuards(GqlPermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async skillUsage(
    @Args('start', { description: 'Start date (inclusive), YYYY-MM-DD' })
    start: string,
    @Args('end', { description: 'End date (inclusive), YYYY-MM-DD' })
    end: string,
    @Args('scope', {
      description: 'Restrict to ours or third-party; omit for both.',
      nullable: true,
      type: () => String,
    })
    scope?: string | null,
    @Args('gitBranch', {
      description: 'Restrict to one git branch; omit for all branches.',
      nullable: true,
      type: () => String,
    })
    gitBranch?: string | null,
    @Args('cwd', {
      description:
        'Restrict to one working directory (project path proxy); omit for all.',
      nullable: true,
      type: () => String,
    })
    cwd?: string | null,
    @Args('skillName', {
      description:
        'Restrict every aggregate to a single skill (detail view); omit for all skills. Trimmed; empty string is treated as omitted.',
      nullable: true,
      type: () => String,
    })
    skillName?: string | null,
  ): Promise<SkillUsageResultObject> {
    assertYyyyMmDd('start', start);
    assertYyyyMmDd('end', end);

    const resolvedSkillName =
      skillName != null && skillName.trim() !== '' ? skillName.trim() : null;

    let resolvedScope: SkillUsageScope | null = null;
    if (scope != null && scope !== '') {
      if (!isSkillUsageScope(scope)) {
        throw new BadRequestException(
          `scope must be "${SKILL_USAGE_SCOPES.OURS}" or "${SKILL_USAGE_SCOPES.THIRD_PARTY}"`,
        );
      }
      resolvedScope = scope;
    }

    const aggregation = await this.skillUsageEventsService.getUsageAggregation({
      cwd: cwd ?? null,
      end,
      gitBranch: gitBranch ?? null,
      scope: resolvedScope,
      skillName: resolvedSkillName,
      start,
    });

    return toSkillUsageResultObject(aggregation);
  }
}
