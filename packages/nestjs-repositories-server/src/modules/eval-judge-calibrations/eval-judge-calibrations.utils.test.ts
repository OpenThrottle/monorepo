import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { EVAL_CALIBRATION_STATUS } from './eval-judge-calibrations.constants.ts';
import { evalJudgeCalibrationsFactory } from './eval-judge-calibrations.factory.ts';
import { createEvalJudgeCalibrationsRepositoryMock } from './eval-judge-calibrations.utils.ts';

describe('createEvalJudgeCalibrationsRepositoryMock', () => {
  it('starts with no calibrations and no judge pairs', async () => {
    const repository = createEvalJudgeCalibrationsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByGrader('g')).resolves.toEqual([]);
    await expect(
      repository.findJudgePairs({
        graderId: 'g',
        graderVersion: '1',
        runId: 'r',
        split: null,
      }),
    ).resolves.toEqual({
      judges: [],
      nConflicted: 0,
      nUnlabeled: 0,
      pairs: [],
    });
  });

  it('records a calibration carrying the input', async () => {
    const repository = createEvalJudgeCalibrationsRepositoryMock();
    const { createdAt, id, ...input } = evalJudgeCalibrationsFactory.build({
      status: EVAL_CALIBRATION_STATUS.NON_GATING,
    });

    await expect(repository.record(input)).resolves.toMatchObject({
      status: 'non_gating',
    });
    expect(createdAt).toBeInstanceOf(Date);
    expect(id).toBeTypeOf('string');
  });

  it('names the eval_judge_calibrations table in inherited not-found errors', async () => {
    const repository = createEvalJudgeCalibrationsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'eval_judge_calibrations record with ID "a" not found',
    );
  });
});
