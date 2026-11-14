import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TelemetryHeartbeat } from './telemetry-heartbeats.entity.ts';
import { TelemetryHeartbeatsService } from './telemetry-heartbeats.service.ts';
import type { UpsertTelemetryHeartbeatInput } from './telemetry-heartbeats.types.ts';

const userId = '11111111-1111-4111-8111-111111111111';

const baseInput: UpsertTelemetryHeartbeatInput = {
  bufferedEvents: 1,
  bufferedOutcomes: 2,
  bufferedTokenUsage: 3,
  bufferedTrajectories: 4,
  deadLetterCount: 0,
  deliveryLeg: 'marketplace',
  machineId: 'machine-1',
  machineLabel: null,
  marketplacePluginInstalled: true,
  marketplacePluginVersion: '1.0.0',
  oldestBufferedAt: null,
  pluginVersion: '1.0.0',
  repoIdentity: 'https://github.com/org/repo',
  source: 'claude-code',
};

describe('TelemetryHeartbeatsService', () => {
  let service: TelemetryHeartbeatsService;
  const query = vi.fn();
  const find = vi.fn();
  const remove = vi.fn();
  const findOneByOrFail = vi.fn();

  beforeEach(async () => {
    vi.resetAllMocks();
    const app = await Test.createTestingModule({
      providers: [
        TelemetryHeartbeatsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(TelemetryHeartbeat),
          useValue: { delete: remove, find, findOneByOrFail, query },
        },
      ],
    }).compile();
    service = app.get(TelemetryHeartbeatsService);
  });

  describe('deleteForUserMachine', () => {
    it("deletes only the user's rows for that machine and returns the count", async () => {
      remove.mockResolvedValue({ affected: 3, raw: [] });

      await expect(
        service.deleteForUserMachine(userId, 'machine-1'),
      ).resolves.toBe(3);
      expect(remove).toHaveBeenCalledWith({ machineId: 'machine-1', userId });
    });

    it('returns 0 when the driver reports no affected count', async () => {
      remove.mockResolvedValue({ raw: [] });

      await expect(
        service.deleteForUserMachine(userId, 'machine-1'),
      ).resolves.toBe(0);
    });
  });

  describe('upsertHeartbeat', () => {
    it('upserts on the heartbeat key and re-reads the row by id', async () => {
      const row = new TelemetryHeartbeat();
      query.mockResolvedValue([{ id: 'row-1' }]);
      findOneByOrFail.mockResolvedValue(row);

      const result = await service.upsertHeartbeat(userId, baseInput);

      expect(result).toBe(row);
      const [sql, params] = query.mock.calls[0] ?? [];
      expect(sql).toContain(
        'ON CONFLICT (user_id, machine_id, repo_identity, delivery_leg, source)',
      );
      expect(sql).toContain('last_seen_at = NOW()');
      expect(sql).not.toContain('first_seen_at =');
      expect(params?.[0]).toBe(userId);
      // total buffered = 1 + 2 + 3 + 4, history capped at 3
      expect(params?.[15]).toBe(10);
      expect(params?.[16]).toBe(3);
      expect(findOneByOrFail).toHaveBeenCalledWith({ id: 'row-1' });
    });

    it('throws when the upsert returns no row', async () => {
      query.mockResolvedValue([]);

      await expect(service.upsertHeartbeat(userId, baseInput)).rejects.toThrow(
        'returned no row',
      );
    });
  });

  describe('listForUser', () => {
    it('lists every row newest first when no since date is given', async () => {
      find.mockResolvedValue([]);

      await service.listForUser(userId, null);

      expect(find).toHaveBeenCalledWith({
        order: { lastSeenAt: 'DESC' },
        where: { userId },
      });
    });

    it('filters on last_seen_at when a since date is given', async () => {
      find.mockResolvedValue([]);

      await service.listForUser(userId, new Date('2026-01-01T00:00:00.000Z'));

      const arg = find.mock.calls[0]?.[0];
      expect(arg.order).toEqual({ lastSeenAt: 'DESC' });
      expect(arg.where.userId).toBe(userId);
      expect(arg.where.lastSeenAt).toBeDefined();
    });
  });
});
