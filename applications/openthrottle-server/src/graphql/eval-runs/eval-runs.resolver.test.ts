import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import {
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
  EVAL_RUN_STATUS,
  EVAL_TRIAL_STATUS,
  type EvalDataset,
  EvalDatasetsService,
  type EvalGrade,
  type EvalHumanLabel,
  EvalHumanLabelsService,
  type EvalRun,
  EvalRunsService,
  type EvalTrial,
} from '@openthrottle/nestjs-repositories';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { EvalRunsResolver } from './eval-runs.resolver.ts';
import { EvalTrialsResolver } from './eval-trials/eval-trials.resolver.ts';

const mockRuns = createMock<EvalRunsService>({
  createRun: vi.fn(),
  findGradesByTrials: vi.fn(),
  findRunById: vi.fn(),
  findRunsByDataset: vi.fn(),
  findTrialsByRun: vi.fn(),
  updateRunStatus: vi.fn(),
  upsertGrade: vi.fn(),
  upsertTrial: vi.fn(),
});
const mockDatasets = createMock<EvalDatasetsService>({ findById: vi.fn() });
const mockLabels = createMock<EvalHumanLabelsService>({
  findByTrajectory: vi.fn(),
});
const mockCls = createMock<GlobalClsService>({ get: vi.fn() });

const at = new Date('2026-11-06T08:00:00.000Z');

const evalDatasetFactory = {
  build: (overrides: Partial<EvalDataset> = {}): EvalDataset => {
    return {
      createdAt: at,
      createdBy: 'visormatt',
      description: null,
      id: 'd1',
      name: 'failures',
      repositoryId: 'repo1',
      target: 'plan_task',
      updatedAt: at,
      version: 1,
      ...overrides,
    };
  },
};

const evalRunFactory = {
  build: (overrides: Partial<EvalRun> = {}): EvalRun => {
    return {
      authMode: 'subscription',
      budgetTokens: null,
      budgetUsd: null,
      createdAt: at,
      createdBy: 'visormatt',
      datasetId: 'd1',
      datasetVersion: 1,
      driver: 'claude',
      effort: null,
      finishedAt: null,
      id: 'r1',
      k: 1,
      model: null,
      promptSha: null,
      skillSha: null,
      startedAt: null,
      status: 'pending',
      ...overrides,
    };
  },
};

const evalTrialFactory = {
  build: (overrides: Partial<EvalTrial> = {}): EvalTrial => {
    return {
      attempt: 1,
      caseId: 'c1',
      costUsd: null,
      createdAt: at,
      durationMs: null,
      error: null,
      id: 't1',
      runId: 'r1',
      status: 'completed',
      trajectoryId: null,
      ...overrides,
    };
  },
};

const evalGradeFactory = {
  build: (overrides: Partial<EvalGrade> = {}): EvalGrade => {
    return {
      cacheKey: null,
      costUsd: null,
      createdAt: at,
      errorReason: null,
      evidence: 'matched',
      graderId: 'g',
      graderKind: 'code',
      graderVersion: '1',
      id: 'g1',
      judgeDriver: null,
      judgeModel: null,
      judgeModelVersion: null,
      trialId: 't1',
      verdict: 'pass',
      ...overrides,
    };
  },
};

const evalHumanLabelFactory = {
  build: (overrides: Partial<EvalHumanLabel> = {}): EvalHumanLabel => {
    return {
      createdAt: at,
      failureType: null,
      id: 'l1',
      note: null,
      rater: 'visormatt',
      trajectoryId: 'tr1',
      updatedAt: at,
      verdict: 'pass',
      ...overrides,
    };
  },
};

const fkError = () => {
  return new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('fk'), { code: '23503' }),
  );
};

const runInput = {
  authMode: 'subscription',
  budgetTokens: null,
  budgetUsd: null,
  datasetId: 'd1',
  driver: 'claude',
  effort: null,
  k: 2,
  model: ' claude-sonnet-5-5 ',
  promptSha: null,
  skillSha: null,
  status: null,
};

const gradeInput = {
  cacheKey: null,
  costUsd: null,
  errorReason: null,
  evidenceJson: '"quoted"',
  graderId: 'g',
  graderKind: 'code',
  graderVersion: '1',
  judgeDriver: null,
  judgeModel: null,
  judgeModelVersion: null,
  trialId: 't1',
  verdict: 'pass',
};

describe('EvalRunsResolver', () => {
  let resolver: EvalRunsResolver;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(mockCls.get).mockReturnValue({
      displayName: 'visormatt',
      email: 'visormatt@example.com',
      isDeleted: false,
      roles: [],
      uuid: 'u1',
    });

    const app = await Test.createTestingModule({
      providers: [
        EvalRunsResolver,
        { provide: EvalRunsService, useValue: mockRuns },
        { provide: EvalDatasetsService, useValue: mockDatasets },
        { provide: GlobalClsService, useValue: mockCls },
      ],
    }).compile();

    resolver = app.get(EvalRunsResolver);
  });

  describe('recordEvalRun', () => {
    test('reads the version from the dataset and stamps the creator', async () => {
      vi.mocked(mockDatasets.findById).mockResolvedValue(
        evalDatasetFactory.build({ id: 'd1', version: 4 }),
      );
      vi.mocked(mockRuns.createRun).mockResolvedValue(evalRunFactory.build());

      await resolver.recordEvalRun(runInput, undefined);

      expect(mockRuns.createRun).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'visormatt',
          datasetVersion: 4,
          model: 'claude-sonnet-5-5',
          status: EVAL_RUN_STATUS.PENDING,
        }),
      );
    });

    test('rejects an unknown authMode', async () => {
      await expect(
        resolver.recordEvalRun({ ...runInput, authMode: 'x' }, undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects an unknown status', async () => {
      await expect(
        resolver.recordEvalRun({ ...runInput, status: 'x' }, undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects a blank driver', async () => {
      await expect(
        resolver.recordEvalRun({ ...runInput, driver: ' ' }, undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects k below 1', async () => {
      await expect(
        resolver.recordEvalRun({ ...runInput, k: 0 }, undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('maps a missing dataset to NotFound', async () => {
      vi.mocked(mockDatasets.findById).mockResolvedValue(null);

      await expect(
        resolver.recordEvalRun(runInput, undefined),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateEvalRunStatus', () => {
    test('returns the updated run', async () => {
      vi.mocked(mockRuns.updateRunStatus).mockResolvedValue(
        evalRunFactory.build({ status: EVAL_RUN_STATUS.COMPLETED }),
      );

      const result = await resolver.updateEvalRunStatus({
        runId: 'r1',
        status: 'completed',
      });

      expect(result.status).toBe('completed');
    });

    test('rejects an unknown status', async () => {
      await expect(
        resolver.updateEvalRunStatus({ runId: 'r1', status: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('maps a missing run to NotFound', async () => {
      vi.mocked(mockRuns.updateRunStatus).mockResolvedValue(null);

      await expect(
        resolver.updateEvalRunStatus({ runId: 'r1', status: 'running' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('recordEvalTrial', () => {
    const trialInput = {
      attempt: 1,
      caseId: 'c1',
      costUsd: null,
      durationMs: 10,
      error: null,
      runId: 'r1',
      status: 'usage_limited',
      trajectoryId: 'tr1',
    };

    test('upserts the trial', async () => {
      vi.mocked(mockRuns.upsertTrial).mockResolvedValue(
        evalTrialFactory.build({ status: EVAL_TRIAL_STATUS.USAGE_LIMITED }),
      );

      const result = await resolver.recordEvalTrial(trialInput);

      expect(result.status).toBe('usage_limited');
    });

    test('rejects an unknown status', async () => {
      await expect(
        resolver.recordEvalTrial({ ...trialInput, status: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects attempt below 1', async () => {
      await expect(
        resolver.recordEvalTrial({ ...trialInput, attempt: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('maps a foreign-key violation to NotFound', async () => {
      vi.mocked(mockRuns.upsertTrial).mockRejectedValue(fkError());

      await expect(resolver.recordEvalTrial(trialInput)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    test('rethrows any other error', async () => {
      const boom = new Error('boom');
      vi.mocked(mockRuns.upsertTrial).mockRejectedValue(boom);

      await expect(resolver.recordEvalTrial(trialInput)).rejects.toBe(boom);
    });
  });

  describe('recordEvalGrade', () => {
    test('upserts a passing code grade and parses evidence', async () => {
      vi.mocked(mockRuns.upsertGrade).mockResolvedValue(
        evalGradeFactory.build({ evidence: 'quoted' }),
      );

      const result = await resolver.recordEvalGrade(gradeInput);

      expect(mockRuns.upsertGrade).toHaveBeenCalledWith(
        expect.objectContaining({ evidence: 'quoted', verdict: 'pass' }),
      );
      expect(result.evidenceJson).toBe('"quoted"');
    });

    test('requires errorReason for an error verdict', async () => {
      await expect(
        resolver.recordEvalGrade({ ...gradeInput, verdict: 'error' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects errorReason on a non-error verdict', async () => {
      await expect(
        resolver.recordEvalGrade({ ...gradeInput, errorReason: 'why' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('accepts an error verdict with a reason and no evidence', async () => {
      vi.mocked(mockRuns.upsertGrade).mockResolvedValue(
        evalGradeFactory.build({
          errorReason: 'timeout',
          evidence: null,
          verdict: EVAL_GRADE_VERDICT.ERROR,
        }),
      );

      const result = await resolver.recordEvalGrade({
        ...gradeInput,
        errorReason: 'timeout',
        evidenceJson: null,
        verdict: 'error',
      });

      expect(result.evidenceJson).toBeNull();
    });

    test('requires judgeModel for a judge grade', async () => {
      await expect(
        resolver.recordEvalGrade({ ...gradeInput, graderKind: 'judge' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('records judge identity for a judge grade', async () => {
      vi.mocked(mockRuns.upsertGrade).mockResolvedValue(
        evalGradeFactory.build({ graderKind: EVAL_GRADER_KIND.JUDGE }),
      );

      await resolver.recordEvalGrade({
        ...gradeInput,
        graderKind: 'judge',
        judgeDriver: 'claude',
        judgeModel: 'claude-sonnet-5-5',
      });

      expect(mockRuns.upsertGrade).toHaveBeenCalledWith(
        expect.objectContaining({
          judgeDriver: 'claude',
          judgeModel: 'claude-sonnet-5-5',
        }),
      );
    });

    test('rejects an unknown graderKind and verdict', async () => {
      await expect(
        resolver.recordEvalGrade({ ...gradeInput, graderKind: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        resolver.recordEvalGrade({ ...gradeInput, verdict: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects malformed evidence JSON', async () => {
      await expect(
        resolver.recordEvalGrade({ ...gradeInput, evidenceJson: '{' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('maps a foreign-key violation to NotFound', async () => {
      vi.mocked(mockRuns.upsertGrade).mockRejectedValue(fkError());

      await expect(resolver.recordEvalGrade(gradeInput)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('queries and fields', () => {
    test('evalRun returns null when missing', async () => {
      vi.mocked(mockRuns.findRunById).mockResolvedValue(null);

      await expect(resolver.evalRun('x')).resolves.toBeNull();
    });

    test('evalRuns maps a dataset list', async () => {
      vi.mocked(mockRuns.findRunsByDataset).mockResolvedValue([
        evalRunFactory.build(),
      ]);

      await expect(resolver.evalRuns('d1')).resolves.toHaveLength(1);
    });

    test('trials maps the run trials', async () => {
      vi.mocked(mockRuns.findTrialsByRun).mockResolvedValue([
        evalTrialFactory.build(),
      ]);

      const run = evalRunFactory.build();

      await expect(resolver.trials(run)).resolves.toHaveLength(1);
    });
  });
});

describe('EvalTrialsResolver', () => {
  let trials: EvalTrialsResolver;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = await Test.createTestingModule({
      providers: [
        EvalTrialsResolver,
        { provide: EvalRunsService, useValue: mockRuns },
        { provide: EvalHumanLabelsService, useValue: mockLabels },
      ],
    }).compile();

    trials = app.get(EvalTrialsResolver);
  });

  test('grades returns the trial grades', async () => {
    vi.mocked(mockRuns.findGradesByTrials).mockResolvedValue([
      evalGradeFactory.build(),
    ]);

    const result = await trials.grades(evalTrialFactory.build({ id: 't1' }));

    expect(mockRuns.findGradesByTrials).toHaveBeenCalledWith(['t1']);
    expect(result).toHaveLength(1);
  });

  describe('labels', () => {
    test('is empty without querying when the trial has no trajectory', async () => {
      const result = await trials.labels(
        evalTrialFactory.build({ trajectoryId: null }),
      );

      expect(result).toEqual([]);
      expect(mockLabels.findByTrajectory).not.toHaveBeenCalled();
    });

    test('returns the labels on the trial trajectory', async () => {
      vi.mocked(mockLabels.findByTrajectory).mockResolvedValue([
        evalHumanLabelFactory.build({ trajectoryId: 'tr1' }),
      ]);

      const result = await trials.labels(
        evalTrialFactory.build({ trajectoryId: 'tr1' }),
      );

      expect(mockLabels.findByTrajectory).toHaveBeenCalledWith('tr1');
      expect(result).toHaveLength(1);
    });
  });
});
