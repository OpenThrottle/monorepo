/**
 * @description GraphQL resolver for the coverage heartbeat ingest. Guarded
 * exactly like recordSkillUsage: authenticated-only (service accounts and
 * human JWTs), attribution resolved server-side, never taken from the client.
 */

import { BadRequestException } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { TelemetryHeartbeatsService } from '@openthrottle/nestjs-repositories';

import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { RecordTelemetryHeartbeatInput } from './telemetry-heartbeat.input.ts';
import {
  toTelemetryHeartbeatObject,
  toUpsertTelemetryHeartbeatInput,
} from './telemetry-heartbeat.mapper.ts';
import { TelemetryHeartbeatObject } from './telemetry-heartbeat.object.ts';

// @authz-stance: authenticated-only (same as recordSkillUsage)
@Resolver(() => TelemetryHeartbeatObject)
export class TelemetryHeartbeatResolver {
  constructor(
    private readonly effectiveUserResolutionService: EffectiveUserResolutionService,
    private readonly telemetryHeartbeatsService: TelemetryHeartbeatsService,
  ) {}

  @Mutation(() => TelemetryHeartbeatObject, {
    description: `Record the per-session coverage heartbeat: which machine, delivery leg and repo, and what sits in the local telemetry buffer. Upserted latest-wins per (machine, repo, leg, source). Attributed to the human user the authenticated principal acts as; a userId is never accepted from the client.`,
  })
  async recordTelemetryHeartbeat(
    @Args('input', { type: () => RecordTelemetryHeartbeatInput })
    input: RecordTelemetryHeartbeatInput,
    @CurrentUser('sub') sub?: string,
  ): Promise<TelemetryHeartbeatObject> {
    const validated = toUpsertTelemetryHeartbeatInput(input);

    const userId =
      await this.effectiveUserResolutionService.resolveEffectiveUserId(sub);
    if (userId === null || userId === undefined) {
      throw new BadRequestException(
        'heartbeat requires an authenticated user principal',
      );
    }

    const saved = await this.telemetryHeartbeatsService.upsertHeartbeat(
      userId,
      validated,
    );

    return toTelemetryHeartbeatObject(saved);
  }
}
