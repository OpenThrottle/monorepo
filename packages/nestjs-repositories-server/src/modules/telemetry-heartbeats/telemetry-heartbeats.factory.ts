/**
 * @description Fishery factory for {@link TelemetryHeartbeat}. Use in tests to build mock
 * heartbeat rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { TelemetryHeartbeat } from './telemetry-heartbeat.entity.ts';

/**
 * @description Column-only shape for building `telemetry_heartbeats` test data.
 * @public
 */
export type TelemetryHeartbeatFactoryData = Pick<
  TelemetryHeartbeat,
  | 'bufferedEvents'
  | 'bufferedOutcomes'
  | 'bufferedTokenUsage'
  | 'bufferedTrajectories'
  | 'createdAt'
  | 'deadLetterCount'
  | 'deliveryLeg'
  | 'firstSeenAt'
  | 'id'
  | 'lastSeenAt'
  | 'machineId'
  | 'machineLabel'
  | 'marketplacePluginInstalled'
  | 'marketplacePluginVersion'
  | 'oldestBufferedAt'
  | 'pluginVersion'
  | 'recentBufferedTotals'
  | 'repoIdentity'
  | 'source'
  | 'userId'
>;

/**
 * @description Builds TelemetryHeartbeat-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const telemetryHeartbeatsFactory =
  Factory.define<TelemetryHeartbeatFactoryData>(() => ({
    bufferedEvents: 0,
    bufferedOutcomes: 0,
    bufferedTokenUsage: 0,
    bufferedTrajectories: 0,
    createdAt: faker.date.past(),
    deadLetterCount: 0,
    deliveryLeg: 'marketplace',
    firstSeenAt: faker.date.past(),
    id: faker.string.uuid(),
    lastSeenAt: faker.date.recent(),
    machineId: faker.string.alphanumeric(12),
    machineLabel: null,
    marketplacePluginInstalled: true,
    marketplacePluginVersion: '1.0.0',
    oldestBufferedAt: null,
    pluginVersion: '1.0.0',
    recentBufferedTotals: [0],
    repoIdentity: 'https://github.com/org/repo',
    source: 'claude-code',
    userId: faker.string.uuid(),
  }));
