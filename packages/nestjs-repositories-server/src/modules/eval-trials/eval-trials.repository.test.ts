import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalTrial } from './eval-trial.entity.ts';
import { EVAL_TRIAL_STATUS } from './eval-trials.constants.ts';
import { evalTrialsFactory } from './eval-trials.factory.ts';
import { EvalTrialsRepository } from './eval-trials.repository.ts';

describe('EvalTrialsRepository', () => {
  const mockRepository = {
    find: vi.fn(),
    findOneByOrFail: vi.fn(),
    target: EvalTrial,
    upsert: vi.fn(),
  };

  let repository: EvalTrialsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalTrialsRepository,
        { provide: getRepositoryToken(EvalTrial), useValue: mockRepository },
      ],
    }).compile();

    repository = app.get(EvalTrialsRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByRun', () => {
    it('lists a run trials', async () => {
      mockRepository.find.mockResolvedValue([]);

      await repository.findByRun('r1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { attempt: 'ASC', createdAt: 'ASC' },
        where: { runId: 'r1' },
      });
    });
  });

  describe('upsertTrial', () => {
    it('upserts on (run, case, attempt) and returns the stored row', async () => {
      const stored = evalTrialsFactory.build({
        status: EVAL_TRIAL_STATUS.USAGE_LIMITED,
      });
      mockRepository.findOneByOrFail.mockResolvedValue(stored);

      const result = await repository.upsertTrial({
        attempt: 1,
        caseId: 'c1',
        costUsd: null,
        durationMs: null,
        error: null,
        runId: 'r1',
        status: EVAL_TRIAL_STATUS.USAGE_LIMITED,
        trajectoryId: null,
      });

      expect(mockRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: 'c1', runId: 'r1' }),
        ['runId', 'caseId', 'attempt'],
      );
      expect(result).toBe(stored);
    });
  });
});
