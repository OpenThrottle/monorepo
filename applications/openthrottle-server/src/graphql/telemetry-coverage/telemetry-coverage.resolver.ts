/**
 * @description GraphQL resolver for the telemetry coverage view on /usage:
 * per machine, which delivery legs report and what is wrong — plus forgetting a
 * retired machine. Scoped to the requesting user and guarded like captureHealth.
 */

import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { TelemetryHeartbeatsService } from '@openthrottle/nestjs-repositories';
import { getOpenThrottleRoot } from '@openthrottle/openthrottle-agentic-utils';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import {
  TELEMETRY_COVERAGE_DEFAULT_WINDOW_DAYS,
  TELEMETRY_COVERAGE_MAX_WINDOW_DAYS,
} from './telemetry-coverage.constants.ts';
import { TelemetryCoverageObject } from './telemetry-coverage.object.ts';
import {
  buildMachineCoverage,
  readCurrentPluginVersion,
} from './telemetry-coverage.utils.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

@Resolver(() => TelemetryCoverageObject)
@UseGuards(GqlPermissionsGuard)
export class TelemetryCoverageResolver {
  // Read once at boot; fail-open to null (no PLUGIN_OUTDATED warnings).
  private readonly currentPluginVersion = readCurrentPluginVersion(
    getOpenThrottleRoot(process.env),
  );

  constructor(
    private readonly effectiveUserResolutionService: EffectiveUserResolutionService,
    private readonly telemetryHeartbeatsService: TelemetryHeartbeatsService,
  ) {}

  @Mutation(() => Int, {
    description: `Forget a machine on the telemetry coverage view: delete every heartbeat row the requesting user has for machineId (all repos, delivery legs and sources), so a retired machine stops raising MACHINE_SILENT. Returns the number of rows deleted (0 when there were none). A later heartbeat from the machine re-adds it.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async forgetTelemetryMachine(
    @Args('machineId', { type: () => String }) machineId: string,
    @CurrentUser('sub') sub?: string,
  ): Promise<number> {
    const trimmed = machineId.trim();
    if (trimmed === '') {
      throw new BadRequestException('machineId is required');
    }
    const userId = await this.requireUserId(sub);

    return this.telemetryHeartbeatsService.deleteForUserMachine(
      userId,
      trimmed,
    );
  }

  @Query(() => TelemetryCoverageObject, {
    description: `Telemetry coverage for the requesting user: per machine, the repos and delivery legs seen in the window, the newest buffer snapshot, and coverage warnings. Machines are ordered by lastSeenAt descending.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async telemetryCoverage(
    @Args('windowDays', {
      defaultValue: TELEMETRY_COVERAGE_DEFAULT_WINDOW_DAYS,
      type: () => Int,
    })
    windowDays: number,
    @CurrentUser('sub') sub?: string,
  ): Promise<TelemetryCoverageObject> {
    if (windowDays < 1 || windowDays > TELEMETRY_COVERAGE_MAX_WINDOW_DAYS) {
      throw new BadRequestException(
        `windowDays must be between 1 and ${TELEMETRY_COVERAGE_MAX_WINDOW_DAYS}`,
      );
    }
    const userId = await this.requireUserId(sub);

    const now = new Date();
    // 2x the window so a machine silent for the window is still listed.
    const rows = await this.telemetryHeartbeatsService.listForUser(
      userId,
      new Date(now.getTime() - 2 * windowDays * DAY_MS),
    );

    return {
      currentPluginVersion: this.currentPluginVersion,
      generatedAt: now,
      machines: buildMachineCoverage(rows, {
        currentPluginVersion: this.currentPluginVersion,
        now,
        windowDays,
      }),
      windowDays,
    };
  }

  private async requireUserId(sub: string | undefined): Promise<string> {
    const userId =
      await this.effectiveUserResolutionService.resolveEffectiveUserId(sub);
    if (userId === null || userId === undefined) {
      throw new BadRequestException(
        'telemetry coverage requires an authenticated user principal',
      );
    }

    return userId;
  }
}
