import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalHumanLabel } from './eval-human-label.entity.ts';
import { evalHumanLabelFactory } from './eval-human-label.factory.ts';
import { EVAL_LABEL_VERDICT } from './eval-human-labels.constants.ts';
import { EvalHumanLabelsService } from './eval-human-labels.service.ts';

describe('EvalHumanLabelsService', () => {
  const trajectoryId = 'a1a2a3a4-0000-4000-8000-000000000001';
  const rater = 'visormatt';

  const mockRepository = {
    delete: vi.fn(),
    find: vi.fn(),
    findOneByOrFail: vi.fn(),
    upsert: vi.fn(),
  };

  let service: EvalHumanLabelsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalHumanLabelsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(EvalHumanLabel),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = app.get<EvalHumanLabelsService>(EvalHumanLabelsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsert', () => {
    const input = {
      failureType: 'wrong-file',
      note: 'edited the wrong module',
      rater,
      trajectoryId,
      verdict: EVAL_LABEL_VERDICT.fail,
    };

    it('upserts on (trajectoryId, rater), bumps updatedAt and returns the stored row', async () => {
      const stored = evalHumanLabelFactory.build(input);
      mockRepository.upsert.mockResolvedValueOnce(undefined);
      mockRepository.findOneByOrFail.mockResolvedValueOnce(stored);

      await expect(service.upsert(input)).resolves.toBe(stored);

      expect(mockRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          failureType: 'wrong-file',
          note: 'edited the wrong module',
          rater,
          trajectoryId,
          updatedAt: expect.any(Date),
          verdict: 'fail',
        }),
        ['trajectoryId', 'rater'],
      );
      expect(mockRepository.findOneByOrFail).toHaveBeenCalledWith({
        rater,
        trajectoryId,
      });
    });

    it('rejects when the upsert fails so the caller can map a foreign key violation', async () => {
      mockRepository.upsert.mockRejectedValueOnce(new Error('fk'));

      await expect(service.upsert(input)).rejects.toThrow('fk');
      expect(mockRepository.findOneByOrFail).not.toHaveBeenCalled();
    });
  });

  describe('findByTrajectory', () => {
    it('lists labels most recently updated first', async () => {
      const rows = [evalHumanLabelFactory.build({ trajectoryId })];
      mockRepository.find.mockResolvedValueOnce(rows);

      await expect(service.findByTrajectory(trajectoryId)).resolves.toBe(rows);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { updatedAt: 'DESC' },
        where: { trajectoryId },
      });
    });
  });

  describe('remove', () => {
    it('returns true when a row was deleted', async () => {
      mockRepository.delete.mockResolvedValueOnce({ affected: 1, raw: [] });

      await expect(service.remove({ rater, trajectoryId })).resolves.toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith({
        rater,
        trajectoryId,
      });
    });

    it('returns false when the rater had no label', async () => {
      mockRepository.delete.mockResolvedValueOnce({ affected: 0, raw: [] });

      await expect(service.remove({ rater, trajectoryId })).resolves.toBe(
        false,
      );
    });

    it('returns false when the driver reports no affected count', async () => {
      mockRepository.delete.mockResolvedValueOnce({ raw: [] });

      await expect(service.remove({ rater, trajectoryId })).resolves.toBe(
        false,
      );
    });
  });

  it('exposes the repository', () => {
    expect(service.getRepository()).toBe(mockRepository);
  });
});
