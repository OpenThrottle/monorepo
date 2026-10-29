/**
 * @description GraphQL resolver for the capture-health signal on /usage: one
 * row per (stream, source) with the time telemetry last arrived, so a silent
 * capture outage is visible instead of looking like a quiet week.
 */

import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import {
  AgentTokenUsageService,
  SkillUsageEventsService,
} from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { toCaptureHealthRowObject } from './capture-health.mapper.ts';
import { CaptureHealthRowObject } from './capture-health.object.ts';

// Workspace-wide (not user-scoped): an outage is a property of the install,
// and the query reveals only source names and timestamps. Guarded like the
// skillUsage / tokenUsage queries it sits beside.
@Resolver(() => CaptureHealthRowObject)
@UseGuards(GqlPermissionsGuard)
export class CaptureHealthResolver {
  constructor(
    private readonly agentTokenUsageService: AgentTokenUsageService,
    private readonly skillUsageEventsService: SkillUsageEventsService,
  ) {}

  @Query(() => [CaptureHealthRowObject], {
    description: `When telemetry last arrived, per (stream, source): skill_events and skill_outcomes by source, token_usage by provider. A source that is absent has never captured; a stale lastCapturedAt means capture may be broken.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async captureHealth(): Promise<CaptureHealthRowObject[]> {
    const [skillRows, tokenRows] = await Promise.all([
      this.skillUsageEventsService.listCaptureHealth(),
      this.agentTokenUsageService.listCaptureHealth(),
    ]);

    return [...skillRows, ...tokenRows].map(toCaptureHealthRowObject);
  }
}
