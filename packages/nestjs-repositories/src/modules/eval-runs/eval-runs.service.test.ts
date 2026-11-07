import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalGrade } from './eval-grade.entity.ts';
import { EvalRun } from './eval-run.entity.ts';
import {
  evalGradeFactory,
  evalRunFactory,
  evalTrialFactory,
} from './eval-run.factory.ts';
import {
  EVAL_AUTH_MODE,
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
  EVAL_RUN_STATUS,
  EVAL_TRIAL_STATUS,
} from './eval-runs.constants.ts';
import { EvalRunsService } from './eval-runs.service.ts';
import { EvalTrial } from './eval-trial.entity.ts';

describe('EvalRunsService', () => {
  const mockRunRepository = {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
  };
  const mockTrialRepository = {
    find: vi.fn(),
    findOneByOrFail: vi.fn(),
    upsert: vi.fn(),
  };
  const mockGradeRepository = {
    find: vi.fn(),
    findOneByOrFail: vi.fn(),
    upsert: vi.fn(),
  };

  let service: EvalRunsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalRunsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: getRepositoryToken(EvalRun), useValue: mockRunRepository },
        {
          provide: getRepositoryToken(EvalTrial),
          useValue: mockTrialRepository,
        },
        {
          provide: getRepositoryToken(EvalGrade),
          useValue: mockGradeRepository,
        },
      ],
    }).compile();

    service = app.get<EvalRunsService>(EvalRunsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockRunRepository.create.mockImplementation((row: object) => row);
    mockRunRepository.save.mockImplementation(async (row: object) => row);
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
      const run = await service.createRun(runInput);

      expect(run.startedAt).toBeNull();
      expect(run.finishedAt).toBeNull();
    });

    it('stamps startedAt for a run created running', async () => {
      const run = await service.createRun({
        ...runInput,
        status: EVAL_RUN_STATUS.RUNNING,
      });

      expect(run.startedAt).toBeInstanceOf(Date);
    });
  });

  describe('updateRunStatus', () => {
    it('returns null when the run does not exist', async () => {
      mockRunRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateRunStatus({
          runId: 'x',
          status: EVAL_RUN_STATUS.RUNNING,
        }),
      ).resolves.toBeNull();
    });

    it('stamps startedAt the first time the run is running', async () => {
      mockRunRepository.findOne.mockResolvedValue(evalRunFactory.build());

      const run = await service.updateRunStatus({
        runId: 'x',
        status: EVAL_RUN_STATUS.RUNNING,
      });

      expect(run?.startedAt).toBeInstanceOf(Date);
      expect(run?.finishedAt).toBeNull();
    });

    it('keeps an existing startedAt', async () => {
      const startedAt = new Date('2026-11-01T00:00:00.000Z');
      mockRunRepository.findOne.mockResolvedValue(
        evalRunFactory.build({ startedAt }),
      );

      const run = await service.updateRunStatus({
        runId: 'x',
        status: EVAL_RUN_STATUS.RUNNING,
      });

      expect(run?.startedAt).toBe(startedAt);
    });

    it('stamps finishedAt on a terminal status', async () => {
      mockRunRepository.findOne.mockResolvedValue(evalRunFactory.build());

      const run = await service.updateRunStatus({
        runId: 'x',
        status: EVAL_RUN_STATUS.COMPLETED,
      });

      expect(run?.finishedAt).toBeInstanceOf(Date);
    });

    it('clears finishedAt when resuming from a pause', async () => {
      mockRunRepository.findOne.mockResolvedValue(
        evalRunFactory.build({
          finishedAt: new Date(),
          status: EVAL_RUN_STATUS.USAGE_LIMITED,
        }),
      );

      const run = await service.updateRunStatus({
        runId: 'x',
        status: EVAL_RUN_STATUS.RUNNING,
      });

      expect(run?.finishedAt).toBeNull();
    });
  });

  describe('findRunById / findRunsByDataset / findTrialsByRun', () => {
    it('finds a run by id', async () => {
      const row = evalRunFactory.build();
      mockRunRepository.findOne.mockResolvedValue(row);

      await expect(service.findRunById(row.id)).resolves.toBe(row);
    });

    it('lists a dataset runs newest first', async () => {
      mockRunRepository.find.mockResolvedValue([]);

      await service.findRunsByDataset('d1');

      expect(mockRunRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { datasetId: 'd1' },
      });
    });

    it('lists a run trials', async () => {
      mockTrialRepository.find.mockResolvedValue([]);

      await service.findTrialsByRun('r1');

      expect(mockTrialRepository.find).toHaveBeenCalledWith({
        order: { attempt: 'ASC', createdAt: 'ASC' },
        where: { runId: 'r1' },
      });
    });
  });

  describe('findGradesByTrials', () => {
    it('returns an empty list without querying for no trials', async () => {
      await expect(service.findGradesByTrials([])).resolves.toEqual([]);
      expect(mockGradeRepository.find).not.toHaveBeenCalled();
    });

    it('queries the grades of the given trials', async () => {
      const rows = [evalGradeFactory.build()];
      mockGradeRepository.find.mockResolvedValue(rows);

      await expect(service.findGradesByTrials(['t1'])).resolves.toBe(rows);
    });
  });

  describe('upsertTrial', () => {
    it('upserts on (run, case, attempt) and returns the stored row', async () => {
      const stored = evalTrialFactory.build({
        status: EVAL_TRIAL_STATUS.USAGE_LIMITED,
      });
      mockTrialRepository.findOneByOrFail.mockResolvedValue(stored);

      const result = await service.upsertTrial({
        attempt: 1,
        caseId: 'c1',
        costUsd: null,
        durationMs: null,
        error: null,
        runId: 'r1',
        status: EVAL_TRIAL_STATUS.USAGE_LIMITED,
        trajectoryId: null,
      });

      expect(mockTrialRepository.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ caseId: 'c1', runId: 'r1' }),
        ['runId', 'caseId', 'attempt'],
      );
      expect(result).toBe(stored);
    });
  });

  describe('upsertGrade', () => {
    it('upserts on (trial, grader id, grader version) and returns the stored row', async () => {
      const stored = evalGradeFactory.build({
        graderKind: EVAL_GRADER_KIND.JUDGE,
        judgeModel: 'claude-sonnet-5-5',
      });
      mockGradeRepository.findOneByOrFail.mockResolvedValue(stored);

      const result = await service.upsertGrade({
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

      expect(mockGradeRepository.upsert).toHaveBeenCalledWith(
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
