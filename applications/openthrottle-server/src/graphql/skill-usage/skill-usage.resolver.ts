/**
 * @description GraphQL resolver for skill usage ingest. Persists harness-
 * captured Skill invocations (ours + third-party). Args are stored as-sent;
 * the server never re-expands truncated/redacted payloads.
 */

import {
  SKILL_USAGE_PRIVACY_LEVELS,
  SKILL_USAGE_SCOPES,
  SkillUsageEventsService,
  type SkillUsagePrivacyLevel,
  type SkillUsageScope,
} from '@openthrottle/nestjs-repositories';
import { BadRequestException } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RecordSkillUsageInput } from './skill-usage.input';
import { toSkillUsageEventObject } from './skill-usage.mapper';
import { SkillUsageEventObject } from './skill-usage.object';

const isSkillUsageScope = (value: string): value is SkillUsageScope =>
  value === SKILL_USAGE_SCOPES.OURS || value === SKILL_USAGE_SCOPES.THIRD_PARTY;

const isSkillUsagePrivacyLevel = (
  value: string,
): value is SkillUsagePrivacyLevel =>
  value === SKILL_USAGE_PRIVACY_LEVELS.FULL ||
  value === SKILL_USAGE_PRIVACY_LEVELS.NAME_ONLY ||
  value === SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED;

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc)
// Service accounts (ot_sa_…) and human JWTs both work; Phase 2b hook posts with
// OPENTHROTTLE_MCP_AUTH_TOKEN.
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
      toolUseId: input.toolUseId ?? null,
    });

    return toSkillUsageEventObject(saved);
  }
}
