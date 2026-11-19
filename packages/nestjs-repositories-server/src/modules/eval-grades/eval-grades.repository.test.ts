import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalGrade } from './eval-grade.entity.ts';
import {
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
} from './eval-grades.constants.ts';
import { evalGradesFactory } from './eval-grades.factory.ts';
import { EvalGradesRepository } from './eval-grades.repository.ts';

describe('EvalGradesRepository', () => {
  const mockRepository = {
    find: vi.fn(),
    findOneByOrFail: vi.fn(),
    target: EvalGrade,
    upsert: vi.fn(),
  };

  let repository: EvalGradesRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalGradesRepository,
        { provide: getRepositoryToken(EvalGrade), useValue: mockRepository },
      ],
    }).compile();

    repository = app.get(EvalGradesRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByTrials', () => {
    it('returns an empty list without querying for no trials', async () => {
      await expect(repository.findByTrials([])).resolves.toEqual([]);
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('queries the grades of the given trials', async () => {
      const rows = [evalGradesFactory.build()];
      mockRepository.find.mockResolvedValue(rows);

      await expect(repository.findByTrials(['t1'])).resolves.toBe(rows);
    });
  });

  describe('upsertGrade', () => {
    it('upserts on (trial, grader id, grader version) and returns the stored row', async () => {
      const stored = evalGradesFactory.build({
        graderKind: EVAL_GRADER_KIND.JUDGE,
        judgeModel: 'claude-sonnet-5-5',
      });
      mockRepository.findOneByOrFail.mockResolvedValue(stored);

      const result = await repository.upsertGrade({
        cacheKey: 'k',
        costUsd: 0.01,
        errorReason: null,
        evidence: 'quoted',
        graderId: 'judge-a',
        graderKind: EVAL_GRADER_KIND.JUDGE,
        graderVersion: '2',
        judgeDriver: 'claude',
        judgeModel: 'claude-sonnet-5-5',
        judgeModelVersion: null,
        trialId: 't1',
        verdict: EVAL_GRADE_VERDICT.PASS,
      });

      expect(mockRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          graderId: 'judge-a',
          judgeModel: 'claude-sonnet-5-5',
        }),
        ['trialId', 'graderId', 'graderVersion'],
      );
      expect(result).toBe(stored);
    });
  });
});
