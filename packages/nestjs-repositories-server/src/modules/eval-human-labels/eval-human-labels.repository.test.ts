import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalHumanLabel } from './eval-human-label.entity.ts';
import { EVAL_LABEL_VERDICT } from './eval-human-labels.constants.ts';
import { evalHumanLabelsFactory } from './eval-human-labels.factory.ts';
import { EvalHumanLabelsRepository } from './eval-human-labels.repository.ts';

describe('EvalHumanLabelsRepository', () => {
  const trajectoryId = 'a1a2a3a4-0000-4000-8000-000000000001';
  const rater = 'visormatt';

  const mockRepository = {
    find: vi.fn(),
    findOneByOrFail: vi.fn(),
    softDelete: vi.fn(),
    target: EvalHumanLabel,
    upsert: vi.fn(),
  };

  let repository: EvalHumanLabelsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalHumanLabelsRepository,
        {
          provide: getRepositoryToken(EvalHumanLabel),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = app.get(EvalHumanLabelsRepository);
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
      const stored = evalHumanLabelsFactory.build(input);
      mockRepository.upsert.mockResolvedValueOnce(undefined);
      mockRepository.findOneByOrFail.mockResolvedValueOnce(stored);

      await expect(repository.upsert(input)).resolves.toBe(stored);

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

    it('revives a soft-deleted label by clearing deletedAt in the upsert', async () => {
      mockRepository.upsert.mockResolvedValueOnce(undefined);
      mockRepository.findOneByOrFail.mockResolvedValueOnce(
        evalHumanLabelsFactory.build(input),
      );

      await repository.upsert(input);

      expect(mockRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: null }),
        ['trajectoryId', 'rater'],
      );
    });

    it('rejects when the upsert fails so the caller can map a foreign key violation', async () => {
      mockRepository.upsert.mockRejectedValueOnce(new Error('fk'));

      await expect(repository.upsert(input)).rejects.toThrow('fk');
      expect(mockRepository.findOneByOrFail).not.toHaveBeenCalled();
    });
  });

  describe('findByTrajectory', () => {
    it('lists labels most recently updated first', async () => {
      const rows = [evalHumanLabelsFactory.build({ trajectoryId })];
      mockRepository.find.mockResolvedValueOnce(rows);

      await expect(repository.findByTrajectory(trajectoryId)).resolves.toBe(
        rows,
      );
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { updatedAt: 'DESC' },
        where: { trajectoryId },
      });
    });
  });

  describe('removeLabel', () => {
    it('soft deletes the rater label and returns true when a live row was removed', async () => {
      mockRepository.softDelete.mockResolvedValueOnce({ affected: 1, raw: [] });

      await expect(
        repository.removeLabel({ rater, trajectoryId }),
      ).resolves.toBe(true);
      expect(mockRepository.softDelete).toHaveBeenCalledWith(
        expect.objectContaining({ rater, trajectoryId }),
      );
    });

    it('returns false when the rater had no live label', async () => {
      mockRepository.softDelete.mockResolvedValueOnce({ affected: 0, raw: [] });

      await expect(
        repository.removeLabel({ rater, trajectoryId }),
      ).resolves.toBe(false);
    });

    it('returns false when the driver reports no affected count', async () => {
      mockRepository.softDelete.mockResolvedValueOnce({ raw: [] });

      await expect(
        repository.removeLabel({ rater, trajectoryId }),
      ).resolves.toBe(false);
    });
  });
});
