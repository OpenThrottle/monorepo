import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { EVAL_TRIAL_STATUS } from './eval-trials.constants.ts';
import { createEvalTrialsRepositoryMock } from './eval-trials.utils.ts';

describe('createEvalTrialsRepositoryMock', () => {
  it('starts with no trials', async () => {
    const repository = createEvalTrialsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByRun('r')).resolves.toEqual([]);
  });

  it('upserts a trial carrying the input', async () => {
    const repository = createEvalTrialsRepositoryMock();

    await expect(
      repository.upsertTrial({
        attempt: 2,
        caseId: 'c',
        costUsd: null,
        durationMs: null,
        error: null,
        runId: 'r',
        status: EVAL_TRIAL_STATUS.ERRORED,
        trajectoryId: null,
      }),
    ).resolves.toMatchObject({ attempt: 2, status: 'errored' });
  });

  it('names the eval_trials table in inherited not-found errors', async () => {
    const repository = createEvalTrialsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'eval_trials record with ID "a" not found',
    );
  });
});
