import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createTelemetryHeartbeatsRepositoryMock } from './telemetry-heartbeats.utils.ts';

describe('createTelemetryHeartbeatsRepositoryMock', () => {
  it('starts as an empty telemetry_heartbeats table', async () => {
    const repository = createTelemetryHeartbeatsRepositoryMock();

    await expect(
      repository.deleteForUserMachine('user-1', 'machine-1'),
    ).resolves.toBe(0);
    await expect(repository.listForUser('user-1', null)).resolves.toEqual([]);
  });

  it('rejects upsertHeartbeat until a test stubs it', async () => {
    const repository = createTelemetryHeartbeatsRepositoryMock();

    await expect(
      repository.upsertHeartbeat('user-1', {
        bufferedEvents: 0,
        bufferedOutcomes: 0,
        bufferedTokenUsage: 0,
        bufferedTrajectories: 0,
        deadLetterCount: 0,
        deliveryLeg: 'marketplace',
        machineId: 'machine-1',
        machineLabel: null,
        marketplacePluginInstalled: null,
        marketplacePluginVersion: null,
        oldestBufferedAt: null,
        pluginVersion: null,
        repoIdentity: null,
        source: 'claude-code',
      }),
    ).rejects.toThrow(
      'telemetry_heartbeats.upsertHeartbeat is not stubbed in this test',
    );
  });

  it('names the telemetry_heartbeats table in inherited not-found errors', async () => {
    const repository = createTelemetryHeartbeatsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'telemetry_heartbeats record with ID "a" not found',
    );
  });
});
