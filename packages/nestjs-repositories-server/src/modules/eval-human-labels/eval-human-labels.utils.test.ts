import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { EVAL_LABEL_VERDICT } from './eval-human-labels.constants.ts';
import { createEvalHumanLabelsRepositoryMock } from './eval-human-labels.utils.ts';

describe('createEvalHumanLabelsRepositoryMock', () => {
  it('starts with no labels', async () => {
    const repository = createEvalHumanLabelsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByTrajectory('t')).resolves.toEqual([]);
    await expect(
      repository.removeLabel({ rater: 'r', trajectoryId: 't' }),
    ).resolves.toBe(false);
  });

  it('upserts a label carrying the input', async () => {
    const repository = createEvalHumanLabelsRepositoryMock();

    await expect(
      repository.upsert({
        failureType: null,
        note: 'bad',
        rater: 'visormatt',
        trajectoryId: 't',
        verdict: EVAL_LABEL_VERDICT.fail,
      }),
    ).resolves.toMatchObject({ note: 'bad', verdict: 'fail' });
  });

  it('names the eval_human_labels table in inherited not-found errors', async () => {
    const repository = createEvalHumanLabelsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'eval_human_labels record with ID "a" not found',
    );
  });
});
