import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
} from './eval-grades.constants.ts';
import { createEvalGradesRepositoryMock } from './eval-grades.utils.ts';

describe('createEvalGradesRepositoryMock', () => {
  it('starts with no grades', async () => {
    const repository = createEvalGradesRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByTrials(['t'])).resolves.toEqual([]);
  });

  it('upserts a grade carrying the input', async () => {
    const repository = createEvalGradesRepositoryMock();

    await expect(
      repository.upsertGrade({
        cacheKey: null,
        costUsd: null,
        errorReason: null,
        evidence: 'quoted',
        graderId: 'g',
        graderKind: EVAL_GRADER_KIND.HUMAN,
        graderVersion: '2',
        judgeDriver: null,
        judgeModel: null,
        judgeModelVersion: null,
        trialId: 't',
        verdict: EVAL_GRADE_VERDICT.FAIL,
      }),
    ).resolves.toMatchObject({ graderId: 'g', verdict: 'fail' });
  });

  it('names the eval_grades table in inherited not-found errors', async () => {
    const repository = createEvalGradesRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'eval_grades record with ID "a" not found',
    );
  });
});
