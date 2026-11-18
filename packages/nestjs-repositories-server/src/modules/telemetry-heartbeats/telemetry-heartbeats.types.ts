import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { TelemetryHeartbeat } from './telemetry-heartbeat.entity.ts';
import type { TELEMETRY_HEARTBEAT_DELIVERY_LEGS } from './telemetry-heartbeats.constants.ts';
import type { TelemetryHeartbeatsRepository } from './telemetry-heartbeats.repository.ts';

/**
 * @description One of the delivery legs a heartbeat may report.
 * @public
 */
export type TelemetryHeartbeatDeliveryLeg =
  (typeof TELEMETRY_HEARTBEAT_DELIVERY_LEGS)[keyof typeof TELEMETRY_HEARTBEAT_DELIVERY_LEGS];

/**
 * @description The validated, already-normalized heartbeat the repository persists.
 * The resolver owns validation; the repository stores what it is given.
 * @public
 */
export interface UpsertTelemetryHeartbeatInput {
  readonly bufferedEvents: number;
  readonly bufferedOutcomes: number;
  readonly bufferedTokenUsage: number;
  readonly bufferedTrajectories: number;
  readonly deadLetterCount: number;
  readonly deliveryLeg: TelemetryHeartbeatDeliveryLeg;
  readonly machineId: string;
  readonly machineLabel: string | null;
  readonly marketplacePluginInstalled: boolean | null;
  readonly marketplacePluginVersion: string | null;
  readonly oldestBufferedAt: Date | null;
  readonly pluginVersion: string | null;
  readonly repoIdentity: string | null;
  readonly source: string;
}

/**
 * @description A {@link TelemetryHeartbeatsRepository} mock: every inherited
 * `BaseRepository` method plus the telemetry-heartbeats ones.
 * @public
 */
export interface TelemetryHeartbeatsRepositoryMock extends BaseRepositoryMock<
  TelemetryHeartbeat,
  CreateModelInput<TelemetryHeartbeat>
> {
  readonly deleteForUserMachine: Mock<
    TelemetryHeartbeatsRepository['deleteForUserMachine']
  >;
  readonly listForUser: Mock<TelemetryHeartbeatsRepository['listForUser']>;
  readonly upsertHeartbeat: Mock<
    TelemetryHeartbeatsRepository['upsertHeartbeat']
  >;
}
