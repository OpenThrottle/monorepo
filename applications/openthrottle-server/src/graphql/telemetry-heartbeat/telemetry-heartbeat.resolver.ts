/**
 * @description GraphQL resolver for the coverage heartbeat ingest. Guarded
 * exactly like recordSkillUsage: authenticated-only (service accounts and
 * human JWTs), attribution resolved server-side, never taken from the client.
 *
 * A heartbeat is the only event that can raise a coverage warning, so this is
 * also where a newly raised one is pushed: one system.alert per (machine, kind)
 * transition, delivered by the developer app as a toast, a bell entry and — in
 * the desktop app — a native notification. Never on page load.
 */

import { BadRequestException } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type TelemetryHeartbeat,
  TelemetryHeartbeatsService,
} from '@openthrottle/nestjs-repositories';
import { getOpenThrottleRoot } from '@openthrottle/openthrottle-agentic-utils';

import { NotificationsService } from '../../notifications/notifications.service.ts';
import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { TELEMETRY_COVERAGE_DEFAULT_WINDOW_DAYS } from '../telemetry-coverage/telemetry-coverage.constants.ts';
import {
  computeWarnings,
  readCurrentPluginVersion,
} from '../telemetry-coverage/telemetry-coverage.utils.ts';
import {
  TELEMETRY_COVERAGE_ALERT_CODE_PREFIX,
  TELEMETRY_COVERAGE_ALERT_LINK,
} from './telemetry-heartbeat.constants.ts';
import { RecordTelemetryHeartbeatInput } from './telemetry-heartbeat.input.ts';
import {
  toTelemetryHeartbeatObject,
  toUpsertTelemetryHeartbeatInput,
} from './telemetry-heartbeat.mapper.ts';
import { TelemetryHeartbeatObject } from './telemetry-heartbeat.object.ts';
import {
  coverageAlertMachineName,
  coverageAlertMessage,
  newCoverageWarnings,
} from './telemetry-heartbeat.utils.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

// @authz-stance: authenticated-only (same as recordSkillUsage)
@Resolver(() => TelemetryHeartbeatObject)
export class TelemetryHeartbeatResolver {
  // Read once at boot, like TelemetryCoverageResolver, so both judge
  // PLUGIN_OUTDATED against the same version.
  private readonly currentPluginVersion = readCurrentPluginVersion(
    getOpenThrottleRoot(process.env),
  );

  constructor(
    private readonly effectiveUserResolutionService: EffectiveUserResolutionService,
    private readonly logger: LoggerService,
    private readonly notificationsService: NotificationsService,
    private readonly telemetryHeartbeatsService: TelemetryHeartbeatsService,
  ) {}

  @Mutation(() => TelemetryHeartbeatObject, {
    description: `Record the per-session coverage heartbeat: which machine, delivery leg and repo, and what sits in the local telemetry buffer. Upserted latest-wins per (machine, repo, leg, source). Attributed to the human user the authenticated principal acts as; a userId is never accepted from the client. A coverage warning this heartbeat newly raises for its machine is pushed once as a system.alert linking to /usage.`,
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

    const before = await this.machineRowsOrNull(userId, validated.machineId);
    const saved = await this.telemetryHeartbeatsService.upsertHeartbeat(
      userId,
      validated,
    );
    if (before !== null) {
      await this.notifyNewWarnings(userId, validated.machineId, before);
    }

    return toTelemetryHeartbeatObject(saved);
  }

  /**
   * The machine's rows inside the /usage default window (2x, as that query
   * fetches), or null when they cannot be read — then nothing is notified,
   * and the heartbeat itself still lands.
   */
  private async machineRowsOrNull(
    userId: string,
    machineId: string,
  ): Promise<TelemetryHeartbeat[] | null> {
    try {
      const since = new Date(
        Date.now() - 2 * TELEMETRY_COVERAGE_DEFAULT_WINDOW_DAYS * DAY_MS,
      );
      const rows = await this.telemetryHeartbeatsService.listForUser(
        userId,
        since,
      );

      return rows.filter((row) => row.machineId === machineId);
    } catch (error) {
      this.logger.warn(
        `telemetry coverage notify skipped: ${error instanceof Error ? error.message : String(error)}`,
        TelemetryHeartbeatResolver.name,
      );

      return null;
    }
  }

  private async notifyNewWarnings(
    userId: string,
    machineId: string,
    beforeRows: readonly TelemetryHeartbeat[],
  ): Promise<void> {
    const afterRows = await this.machineRowsOrNull(userId, machineId);
    const newest = afterRows?.[0];
    if (afterRows === null || newest === undefined) {
      return;
    }
    const options = {
      currentPluginVersion: this.currentPluginVersion,
      now: new Date(),
      windowDays: TELEMETRY_COVERAGE_DEFAULT_WINDOW_DAYS,
    };
    const raised = newCoverageWarnings(
      computeWarnings(beforeRows, options),
      computeWarnings(afterRows, options),
    );
    const machineName = coverageAlertMachineName(
      machineId,
      newest.machineLabel,
    );
    for (const warning of raised) {
      this.notificationsService.emitSystemAlert({
        code: `${TELEMETRY_COVERAGE_ALERT_CODE_PREFIX}${warning.kind}`,
        link: TELEMETRY_COVERAGE_ALERT_LINK,
        message: coverageAlertMessage(machineName, warning),
        severity: 'warning',
      });
    }
  }
}
