import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';

import { PlanRunSchedule } from './plan-run-schedules.entity.ts';
import { PlanRunSchedulesService } from './plan-run-schedules.service.ts';

const buildService = async (
  mockRepo: Record<string, ReturnType<typeof vi.fn>>,
): Promise<PlanRunSchedulesService> => {
  const app = await Test.createTestingModule({
    providers: [
      PlanRunSchedulesService,
      { provide: getRepositoryToken(PlanRunSchedule), useValue: mockRepo },
    ],
  }).compile();

  return app.get(PlanRunSchedulesService);
};

const emptyPatch = {
  cronPattern: undefined,
  enabled: undefined,
  misfirePolicy: undefined,
  runOverrides: undefined,
  timezone: undefined,
};

describe('PlanRunSchedulesService', () => {
  describe('findByPlanIds', () => {
    it('reads every plan in one query, oldest first', async () => {
      const find = vi.fn(() => Promise.resolve([]));
      const service = await buildService({ find });

      await service.findByPlanIds(['plan-1', 'plan-2']);

      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'ASC' } }),
      );
    });
  });

  describe('create', () => {
    it('applies defaults and saves', async () => {
      const create = vi.fn((row: object) => row);
      const save = vi.fn((row: object) => Promise.resolve(row));
      const service = await buildService({ create, save });

      await service.create({
        createdBy: 'visormatt',
        cronPattern: '0 9 * * 1',
        enabled: undefined,
        misfirePolicy: undefined,
        planId: 'plan-1',
        runOverrides: undefined,
        timezone: null,
      });

      expect(create).toHaveBeenCalledWith({
        createdBy: 'visormatt',
        cronPattern: '0 9 * * 1',
        enabled: true,
        misfirePolicy: 'skip',
        planId: 'plan-1',
        runOverrides: {},
        timezone: null,
      });
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('keeps explicit values', async () => {
      const create = vi.fn((row: object) => row);
      const service = await buildService({
        create,
        save: vi.fn((row: object) => Promise.resolve(row)),
      });

      await service.create({
        createdBy: null,
        cronPattern: '*/5 * * * *',
        enabled: false,
        misfirePolicy: 'run_once',
        planId: 'plan-1',
        runOverrides: { model: 'x' },
        timezone: 'Europe/Berlin',
      });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
          misfirePolicy: 'run_once',
          runOverrides: { model: 'x' },
          timezone: 'Europe/Berlin',
        }),
      );
    });
  });

  describe('lookups', () => {
    it('findById queries by id', async () => {
      const findOne = vi.fn().mockResolvedValue(null);
      const service = await buildService({ findOne });

      await expect(service.findById('s1')).resolves.toBeNull();
      expect(findOne).toHaveBeenCalledWith({ where: { id: 's1' } });
    });

    it('findByPlanId filters by plan, oldest first', async () => {
      const find = vi.fn().mockResolvedValue([]);
      const service = await buildService({ find });

      await service.findByPlanId('plan-1');

      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { planId: 'plan-1' },
      });
    });

    it('listEnabled filters on enabled', async () => {
      const find = vi.fn().mockResolvedValue([]);
      const service = await buildService({ find });

      await service.listEnabled();

      expect(find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { enabled: true },
      });
    });
  });

  describe('update', () => {
    it('writes only the defined fields, then re-reads', async () => {
      const update = vi.fn().mockResolvedValue({ affected: 1 });
      const findOne = vi.fn().mockResolvedValue({ id: 's1' });
      const service = await buildService({ findOne, update });

      const row = await service.update('s1', {
        ...emptyPatch,
        cronPattern: '0 0 * * *',
        timezone: null,
      });

      expect(update).toHaveBeenCalledWith(
        { id: 's1' },
        { cronPattern: '0 0 * * *', timezone: null },
      );
      expect(row).toEqual({ id: 's1' });
    });

    it('skips the write for an empty patch', async () => {
      const update = vi.fn();
      const findOne = vi.fn().mockResolvedValue({ id: 's1' });
      const service = await buildService({ findOne, update });

      await service.update('s1', emptyPatch);

      expect(update).not.toHaveBeenCalled();
    });

    it('returns null when the schedule is missing', async () => {
      const service = await buildService({
        findOne: vi.fn().mockResolvedValue(null),
        update: vi.fn().mockResolvedValue({ affected: 0 }),
      });

      await expect(
        service.update('missing', { ...emptyPatch, enabled: false }),
      ).resolves.toBeNull();
    });
  });

  describe('setEnabled', () => {
    it('updates only the enabled flag', async () => {
      const update = vi.fn().mockResolvedValue({ affected: 1 });
      const service = await buildService({
        findOne: vi.fn().mockResolvedValue({ id: 's1' }),
        update,
      });

      await service.setEnabled('s1', false);

      expect(update).toHaveBeenCalledWith({ id: 's1' }, { enabled: false });
    });
  });
});
