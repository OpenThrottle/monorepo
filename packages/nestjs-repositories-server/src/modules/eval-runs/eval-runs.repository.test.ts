import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalRun } from './eval-run.entity.ts';
import { EVAL_AUTH_MODE, EVAL_RUN_STATUS } from './eval-runs.constants.ts';
import { evalRunsFactory } from './eval-runs.factory.ts';
import { EvalRunsRepository } from './eval-runs.repository.ts';

describe('EvalRunsRepository', () => {
  const mockRepository = {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    target: EvalRun,
  };

  let repository: EvalRunsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalRunsRepository,
        { provide: getRepositoryToken(EvalRun), useValue: mockRepository },
      ],
    }).compile();

    repository = app.get(EvalRunsRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository.create.mockImplementation((row: object) => row);
    mockRepository.save.mockImplementation(async (row: object) => row);
  });

  const runInput = {
    authMode: EVAL_AUTH_MODE.API_KEY,
    budgetTokens: null,
    budgetUsd: null,
    createdBy: 'visormatt',
    datasetId: 'd1',
    datasetVersion: 2,
    driver: 'claude',
    effort: null,
    k: 3,
    model: null,
    promptSha: null,
    skillSha: null,
    status: EVAL_RUN_STATUS.PENDING,
  };

  describe('createRun', () => {
    it('leaves startedAt null for a pending run', async () => {
      const run = await repository.createRun(runInput);

      expect(run.startedAt).toBeNull();
      expect(run.finishedAt).toBeNull();
    });

    it('stamps startedAt for a run created running', async () => {
      const run = await repository.createRun({
        ...runInput,
        status: EVAL_RUN_STATUS.RUNNING,
      });

      expect(run.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateRunStatus', () => {
    it('returns null when the run does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        repository.updateRunStatus({
          runId: 'x',
          status: EVAL_RUN_STATUS.RUNNING,
        }),
      ).resolves.toBeNull();
    });

    it('stamps startedAt the first time the run is running', async () => {
      mockRepository.findOne.mockResolvedValue(evalRunsFactory.build());

      const run = await repository.updateRunStatus({
        runId: 'x',
        status: EVAL_RUN_STATUS.RUNNING,
      });

      expect(run?.startedAt).toBeInstanceOf(Date);
      expect(run?.finishedAt).toBeNull();
    });

    it('keeps an existing startedAt', async () => {
      const startedAt = new Date('2026-11-01T00:00:00.000Z');
      mockRepository.findOne.mockResolvedValue(
        evalRunsFactory.build({ startedAt }),
      );

      const run = await repository.updateRunStatus({
        runId: 'x',
        status: EVAL_RUN_STATUS.RUNNING,
      });

      expect(run?.startedAt).toBe(startedAt);
    });

    it('stamps finishedAt on a terminal status', async () => {
      mockRepository.findOne.mockResolvedValue(evalRunsFactory.build());

      const run = await repository.updateRunStatus({
        runId: 'x',
        status: EVAL_RUN_STATUS.COMPLETED,
      });

      expect(run?.finishedAt).toBeInstanceOf(Date);
    });

    it('clears finishedAt when resuming from a pause', async () => {
      mockRepository.findOne.mockResolvedValue(
        evalRunsFactory.build({
          finishedAt: new Date('2026-11-01T01:00:00.000Z'),
          status: EVAL_RUN_STATUS.USAGE_LIMITED,
        }),
      );

      const run = await repository.updateRunStatus({
        runId: 'x',
        status: EVAL_RUN_STATUS.RUNNING,
      });

      expect(run?.finishedAt).toBeNull();
    });
  });

  describe('findRunById / findRunsByDataset', () => {
    it('finds a run by id', async () => {
      const row = evalRunsFactory.build();
      mockRepository.findOne.mockResolvedValue(row);

      await expect(repository.findRunById(row.id)).resolves.toBe(row);
    });

    it('returns null for a missing run instead of throwing', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(repository.findRunById('nope')).resolves.toBeNull();
    });

    it('lists a dataset runs newest first', async () => {
      mockRepository.find.mockResolvedValue([]);

      await repository.findRunsByDataset('d1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { datasetId: 'd1' },
      });
    });
  });
});
