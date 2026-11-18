import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PERMISSIONS, PERMISSIONS_KEY } from '@openthrottle/nestjs-rbac';
import { RolesService } from '@openthrottle/nestjs-repositories';
import {
  type TelemetryHeartbeat,
  TelemetryHeartbeatsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createTelemetryHeartbeatsRepositoryMock,
  type TelemetryHeartbeatsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { EffectiveUserResolutionService } from '../../services/effective-user-resolution/effective-user-resolution.service.ts';
import { TelemetryCoverageResolver } from './telemetry-coverage.resolver.ts';

const FIXED_NOW = new Date('2026-11-13T12:00:00.000Z');
const userId = '11111111-1111-4111-8111-111111111111';

describe('TelemetryCoverageResolver', () => {
  let resolver: TelemetryCoverageResolver;
  let heartbeats: TelemetryHeartbeatsRepositoryMock;
  const resolveEffectiveUserId = vi.fn();

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    resolveEffectiveUserId.mockResolvedValue(userId);
    heartbeats = createTelemetryHeartbeatsRepositoryMock();
    heartbeats.listForUser.mockResolvedValue([]);
    const app = await Test.createTestingModule({
      providers: [
        TelemetryCoverageResolver,
        {
          provide: TelemetryHeartbeatsRepository,
          useValue: heartbeats,
        },
        {
          provide: EffectiveUserResolutionService,
          useValue: { resolveEffectiveUserId },
        },
        { provide: RolesService, useValue: createMock<RolesService>() },
        GqlPermissionsGuard,
      ],
    }).compile();
    resolver = app.get(TelemetryCoverageResolver);
  });

  test('requires SETTINGS_READ', () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      TelemetryCoverageResolver.prototype.telemetryCoverage,
    );

    expect(permissions).toEqual([PERMISSIONS.SETTINGS_READ]);
  });

  test('scopes the query to the resolved user and fetches 2x the window', async () => {
    await resolver.telemetryCoverage(14, 'sub-1');

    expect(resolveEffectiveUserId).toHaveBeenCalledWith('sub-1');
    const [calledUser, since] = heartbeats.listForUser.mock.calls[0] ?? [];
    expect(calledUser).toBe(userId);
    expect(since).toEqual(new Date(FIXED_NOW.getTime() - 28 * 86_400_000));
  });

  test('returns the object shape with machines from the rows', async () => {
    heartbeats.listForUser.mockResolvedValue([
      createMock<TelemetryHeartbeat>({
        bufferedEvents: 1,
        bufferedOutcomes: 0,
        bufferedTokenUsage: 0,
        bufferedTrajectories: 0,
        deliveryLeg: 'repo',
        lastSeenAt: FIXED_NOW,
        machineId: 'm1',
        machineLabel: null,
        marketplacePluginInstalled: false,
        marketplacePluginVersion: null,
        oldestBufferedAt: null,
        pluginVersion: null,
        recentBufferedTotals: [],
        repoIdentity: null,
      }),
    ]);

    const result = await resolver.telemetryCoverage(7, 'sub-1');

    expect(result.windowDays).toBe(7);
    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(result.machines).toHaveLength(1);
    expect(result.machines[0]?.machineId).toBe('m1');
    expect(result.machines[0]?.warnings.map((w) => w.kind)).toContain(
      'MANUAL_SESSIONS_UNCOVERED',
    );
  });

  describe('when there is no user principal', () => {
    test('rejects with BadRequestException', async () => {
      resolveEffectiveUserId.mockResolvedValue(null);

      await expect(resolver.telemetryCoverage(14, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('when windowDays is out of range', () => {
    test('rejects', async () => {
      await expect(resolver.telemetryCoverage(0, 'sub-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(resolver.telemetryCoverage(9999, 'sub-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('forgetTelemetryMachine', () => {
    test('requires SETTINGS_WRITE', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        TelemetryCoverageResolver.prototype.forgetTelemetryMachine,
      );

      expect(permissions).toEqual([PERMISSIONS.SETTINGS_WRITE]);
    });

    test("deletes the resolved user's rows for the trimmed machine id", async () => {
      heartbeats.deleteForUserMachine.mockResolvedValue(2);

      await expect(
        resolver.forgetTelemetryMachine(' m1 ', 'sub-1'),
      ).resolves.toBe(2);
      expect(heartbeats.deleteForUserMachine).toHaveBeenCalledWith(
        userId,
        'm1',
      );
    });

    describe('when the machine id is blank', () => {
      test('rejects without deleting', async () => {
        await expect(
          resolver.forgetTelemetryMachine('  ', 'sub-1'),
        ).rejects.toThrow(BadRequestException);
        expect(heartbeats.deleteForUserMachine).not.toHaveBeenCalled();
      });
    });

    describe('when there is no user principal', () => {
      test('rejects without deleting', async () => {
        resolveEffectiveUserId.mockResolvedValue(null);

        await expect(
          resolver.forgetTelemetryMachine('m1', undefined),
        ).rejects.toThrow(BadRequestException);
        expect(heartbeats.deleteForUserMachine).not.toHaveBeenCalled();
      });
    });
  });
});
