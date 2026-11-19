import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { EVAL_AUTH_MODE, EVAL_RUN_STATUS } from './eval-runs.constants.ts';
import { createEvalRunsRepositoryMock } from './eval-runs.utils.ts';

describe('createEvalRunsRepositoryMock', () => {
  it('starts with no runs', async () => {
    const repository = createEvalRunsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findRunById('a')).resolves.toBeNull();
    await expect(repository.findRunsByDataset('d')).resolves.toEqual([]);
    await expect(
      repository.updateRunStatus({
        runId: 'a',
        status: EVAL_RUN_STATUS.COMPLETED,
      }),
    ).resolves.toBeNull();
  });

  it('creates a run carrying the input', async () => {
    const repository = createEvalRunsRepositoryMock();

    await expect(
      repository.createRun({
        authMode: EVAL_AUTH_MODE.API_KEY,
        budgetTokens: null,
        budgetUsd: null,
        createdBy: 'visormatt',
        datasetId: 'd',
        datasetVersion: 2,
        driver: 'claude',
        effort: null,
        k: 3,
        model: null,
        promptSha: null,
        skillSha: null,
        status: EVAL_RUN_STATUS.PENDING,
      }),
    ).resolves.toMatchObject({ authMode: 'api_key', datasetVersion: 2, k: 3 });
  });

  it('names the eval_runs table in inherited not-found errors', async () => {
    const repository = createEvalRunsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'eval_runs record with ID "a" not found',
    );
  });
});
