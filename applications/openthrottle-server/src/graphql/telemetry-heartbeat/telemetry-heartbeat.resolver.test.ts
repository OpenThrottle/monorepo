import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type TelemetryHeartbeat,
  TelemetryHeartbeatsService,
} from '@openthrottle/nestjs-repositories';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { NotificationsService } from '../../notifications/notifications.service.ts';
import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import type { RecordTelemetryHeartbeatInput } from './telemetry-heartbeat.input.ts';
import { TelemetryHeartbeatResolver } from './telemetry-heartbeat.resolver.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

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
  const listForUser = vi.fn();
  const emitSystemAlert = vi.fn();
  const resolveEffectiveUserId = vi.fn();

  beforeEach(async () => {
    vi.resetAllMocks();
    resolveEffectiveUserId.mockResolvedValue(userId);
    upsertHeartbeat.mockResolvedValue(
      createMock<TelemetryHeartbeat>({ id: 'hb-1' }),
    );
    listForUser.mockResolvedValue([]);
    const app = await Test.createTestingModule({
      providers: [
        TelemetryHeartbeatResolver,
        {
          provide: TelemetryHeartbeatsService,
          useValue: createMock<TelemetryHeartbeatsService>({
            listForUser,
            upsertHeartbeat,
          }),
        },
        {
          provide: NotificationsService,
          useValue: createMock<NotificationsService>({ emitSystemAlert }),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
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

  describe('coverage notifications', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    const row = (
      overrides: Partial<TelemetryHeartbeat>,
    ): TelemetryHeartbeat => {
      return createMock<TelemetryHeartbeat>({
        bufferedEvents: 0,
        bufferedOutcomes: 0,
        bufferedTokenUsage: 0,
        bufferedTrajectories: 0,
        deadLetterCount: 0,
        deliveryLeg: 'marketplace',
        lastSeenAt: FIXED_NOW,
        machineId: 'machine-1',
        machineLabel: 'work-laptop',
        marketplacePluginInstalled: true,
        marketplacePluginVersion: null,
        oldestBufferedAt: null,
        pluginVersion: null,
        recentBufferedTotals: [],
        repoIdentity: null,
        ...overrides,
      });
    };

    test('alerts once for a warning the heartbeat newly raised', async () => {
      listForUser.mockResolvedValueOnce([row({})]).mockResolvedValueOnce([
        row({ deadLetterCount: 2 }),
        row({
          machineId: 'other-machine',
          marketplacePluginInstalled: false,
        }),
      ]);

      await resolver.recordTelemetryHeartbeat(validInput, 'sub-1');

      expect(emitSystemAlert).toHaveBeenCalledTimes(1);
      expect(emitSystemAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'telemetry-coverage.DEAD_LETTERED',
          link: '/usage',
          message: expect.stringContaining('work-laptop'),
          severity: 'warning',
        }),
      );
    });

    test('stays quiet while a warning stays raised', async () => {
      const uncovered = row({ marketplacePluginInstalled: false });
      listForUser
        .mockResolvedValueOnce([uncovered])
        .mockResolvedValueOnce([uncovered]);

      await resolver.recordTelemetryHeartbeat(validInput, 'sub-1');

      expect(emitSystemAlert).not.toHaveBeenCalled();
    });

    test('still records the heartbeat when the rows cannot be read', async () => {
      listForUser.mockRejectedValue(new Error('db down'));

      await expect(
        resolver.recordTelemetryHeartbeat(validInput, 'sub-1'),
      ).resolves.toBeDefined();
      expect(upsertHeartbeat).toHaveBeenCalled();
      expect(emitSystemAlert).not.toHaveBeenCalled();
    });
  });
});
