import type { TELEMETRY_HEARTBEAT_DELIVERY_LEGS } from './telemetry-heartbeats.constants.ts';

export type TelemetryHeartbeatDeliveryLeg =
  (typeof TELEMETRY_HEARTBEAT_DELIVERY_LEGS)[keyof typeof TELEMETRY_HEARTBEAT_DELIVERY_LEGS];

/**
 * The validated, already-normalized heartbeat the service persists. The
 * resolver owns validation; the service stores what it is given.
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
