import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  type TelemetryHeartbeat,
  TelemetryHeartbeatsService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import type { RecordTelemetryHeartbeatInput } from './telemetry-heartbeat.input.ts';
import { TelemetryHeartbeatResolver } from './telemetry-heartbeat.resolver.ts';

const userId = '11111111-1111-4111-8111-111111111111';

const validInput: RecordTelemetryHeartbeatInput = {
  bufferedEvents: 1,
  bufferedOutcomes: 0,
  bufferedTokenUsage: 0,
  bufferedTrajectories: 0,
  deadLetterCount: 0,
  deliveryLeg: 'marketplace',
  machineId: 'machine-1',
  machineLabel: null,
  marketplacePluginInstalled: true,
  marketplacePluginVersion: '1.0.0',
  occurredAt: new Date('2026-01-15T12:00:00.000Z'),
  oldestBufferedAt: null,
  pluginVersion: '1.0.0',
  repoIdentity: 'git@github.com:Org/Repo.git',
  source: 'claude-code',
};

describe('TelemetryHeartbeatResolver', () => {
  let resolver: TelemetryHeartbeatResolver;
  const upsertHeartbeat = vi.fn();
  const resolveEffectiveUserId = vi.fn();

  beforeEach(async () => {
    vi.resetAllMocks();
    resolveEffectiveUserId.mockResolvedValue(userId);
    upsertHeartbeat.mockResolvedValue(
      createMock<TelemetryHeartbeat>({ id: 'hb-1' }),
    );
    const app = await Test.createTestingModule({
      providers: [
        TelemetryHeartbeatResolver,
        {
          provide: TelemetryHeartbeatsService,
          useValue: createMock<TelemetryHeartbeatsService>({ upsertHeartbeat }),
        },
        {
          provide: EffectiveUserResolutionService,
          useValue: { resolveEffectiveUserId },
        },
      ],
    }).compile();
    resolver = app.get(TelemetryHeartbeatResolver);
  });

  describe('recordTelemetryHeartbeat', () => {
    test('passes the normalized repo identity to the service', async () => {
      await resolver.recordTelemetryHeartbeat(validInput, 'sub-1');

      expect(resolveEffectiveUserId).toHaveBeenCalledWith('sub-1');
      expect(upsertHeartbeat).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          deliveryLeg: 'marketplace',
          machineId: 'machine-1',
          repoIdentity: 'https://github.com/Org/Repo',
        }),
      );
    });

    test('stores null when the repo identity cannot be normalized', async () => {
      await resolver.recordTelemetryHeartbeat(
        { ...validInput, repoIdentity: 'not a remote' },
        'sub-1',
      );

      expect(upsertHeartbeat).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ repoIdentity: null }),
      );
    });

    test.each(['/Users/me/repo', '~/repo', 'C:\\work\\repo'])(
      'rejects the path-shaped repoIdentity %s',
      async (repoIdentity) => {
        await expect(
          resolver.recordTelemetryHeartbeat(
            { ...validInput, repoIdentity },
            'sub-1',
          ),
        ).rejects.toThrow(BadRequestException);
        expect(upsertHeartbeat).not.toHaveBeenCalled();
      },
    );

    test('rejects an unknown deliveryLeg', async () => {
      await expect(
        resolver.recordTelemetryHeartbeat(
          { ...validInput, deliveryLeg: 'carrier-pigeon' },
          'sub-1',
        ),
      ).rejects.toThrow(/deliveryLeg must be one of/);
    });

    test('rejects an empty or over-long machineId', async () => {
      await expect(
        resolver.recordTelemetryHeartbeat(
          { ...validInput, machineId: '  ' },
          'sub-1',
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        resolver.recordTelemetryHeartbeat(
          { ...validInput, machineId: 'x'.repeat(65) },
          'sub-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    test('rejects an email-shaped string field', async () => {
      await expect(
        resolver.recordTelemetryHeartbeat(
          { ...validInput, machineLabel: 'me@example.com' },
          'sub-1',
        ),
      ).rejects.toThrow(/email/);
    });

    test('rejects a negative count', async () => {
      await expect(
        resolver.recordTelemetryHeartbeat(
          { ...validInput, bufferedEvents: -1 },
          'sub-1',
        ),
      ).rejects.toThrow(/non-negative/);
    });

    test('rejects a principal that resolves to no user', async () => {
      resolveEffectiveUserId.mockResolvedValue(null);

      await expect(
        resolver.recordTelemetryHeartbeat(validInput, 'sub-1'),
      ).rejects.toThrow(BadRequestException);
      expect(upsertHeartbeat).not.toHaveBeenCalled();
    });
  });
});
