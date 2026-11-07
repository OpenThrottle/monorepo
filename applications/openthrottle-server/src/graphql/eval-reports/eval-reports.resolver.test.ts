import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  type EvalCase,
  type EvalDataset,
  EvalDatasetsService,
  type EvalGrade,
  type EvalJudgeCalibration,
  EvalJudgeCalibrationsService,
  type EvalRun,
  EvalRunsService,
  type EvalTrial,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { EvalReportsResolver } from './eval-reports.resolver.ts';

const mockDatasets = createMock<EvalDatasetsService>({
  findById: vi.fn(),
  findCases: vi.fn(),
});
const mockCalibrations = createMock<EvalJudgeCalibrationsService>({
  findByGrader: vi.fn(),
});
const mockRuns = createMock<EvalRunsService>({
  findGradesByTrials: vi.fn(),
  findRunById: vi.fn(),
  findTrialsByRun: vi.fn(),
});

const at = new Date('2026-11-06T08:00:00.000Z');

const dataset = (overrides: Partial<EvalDataset> = {}): EvalDataset => {
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
};

const evalCase = (id: string, split: 'dev' | 'test' = 'dev'): EvalCase => {
  return {
    createdAt: at,
    datasetId: 'd1',
    gold: {},
    id,
    input: {},
    sourceTrajectoryId: null,
    split,
  };
};

const run = (overrides: Partial<EvalRun> = {}): EvalRun => {
  return {
    authMode: 'api_key',
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
    model: 'opus',
    promptSha: null,
    skillSha: null,
    startedAt: null,
    status: 'completed',
    ...overrides,
  };
};

const trial = (id: string, caseId: string, runId = 'r1'): EvalTrial => {
  return {
    attempt: 1,
    caseId,
    costUsd: 1,
    createdAt: at,
    durationMs: null,
    error: null,
    id,
    runId,
    status: 'completed',
    trajectoryId: null,
  };
};

const grade = (
  trialId: string,
  verdict: 'fail' | 'pass',
  overrides: Partial<EvalGrade> = {},
): EvalGrade => {
  return {
    cacheKey: null,
    costUsd: null,
    createdAt: at,
    errorReason: null,
    evidence: 'matched',
    graderId: 'tests',
    graderKind: 'code',
    graderVersion: '1',
    id: `g-${trialId}-${overrides.graderId ?? 'tests'}`,
    judgeDriver: null,
    judgeModel: null,
    judgeModelVersion: null,
    trialId,
    verdict,
    ...overrides,
  };
};

const calibration = (
  overrides: Partial<EvalJudgeCalibration> = {},
): EvalJudgeCalibration => {
  return {
    catchRate: 0.8,
    createdAt: at,
    createdBy: 'visormatt',
    datasetId: 'd1',
    falseFailRate: 0.1,
    graderId: 'judge',
    graderVersion: '1',
    heldOut: false,
    id: 'cal1',
    judgeDriver: 'claude',
    judgeModel: 'opus',
    judgeModelVersion: null,
    kappa: 0.7,
    kappaCiHigh: 0.9,
    kappaCiLow: 0.5,
    n: 30,
    nExcluded: 0,
    runId: 'r1',
    split: 'dev',
    status: 'gating',
    ...overrides,
  };
};

describe('EvalReportsResolver', () => {
  let resolver: EvalReportsResolver;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(mockDatasets.findById).mockResolvedValue(dataset());
    vi.mocked(mockDatasets.findCases).mockResolvedValue([
      evalCase('c1'),
      evalCase('c2', 'test'),
    ]);
    vi.mocked(mockCalibrations.findByGrader).mockResolvedValue([]);

    const app = await Test.createTestingModule({
      providers: [
        EvalReportsResolver,
        { provide: EvalDatasetsService, useValue: mockDatasets },
        { provide: EvalJudgeCalibrationsService, useValue: mockCalibrations },
        { provide: EvalRunsService, useValue: mockRuns },
      ],
    }).compile();

    resolver = app.get(EvalReportsResolver);
  });

  describe('evalRunReport', () => {
    test('builds the report from stored trials and grades', async () => {
      vi.mocked(mockRuns.findRunById).mockResolvedValue(run());
      vi.mocked(mockRuns.findTrialsByRun).mockResolvedValue([
        trial('t1', 'c1'),
        trial('t2', 'c2'),
      ]);
      vi.mocked(mockRuns.findGradesByTrials).mockResolvedValue([
        grade('t1', 'pass'),
        grade('t2', 'fail'),
      ]);

      const report = await resolver.evalRunReport('r1');

      expect(report.datasetName).toBe('failures');
      expect(report.run.model).toBe('opus');
      expect(report.numbers.passRate).toBe(0.5);
      expect(report.numbers.trialsCounted).toBe(2);
      expect(report.cases).toEqual([
        {
          attemptsCounted: 1,
          attemptsPassed: 1,
          caseId: 'c1',
          passed: true,
          split: 'dev',
        },
        {
          attemptsCounted: 1,
          attemptsPassed: 0,
          caseId: 'c2',
          passed: false,
          split: 'test',
        },
      ]);
    });

    test('counts a judge only when its latest calibration is gating', async () => {
      vi.mocked(mockRuns.findRunById).mockResolvedValue(run());
      vi.mocked(mockRuns.findTrialsByRun).mockResolvedValue([
        trial('t1', 'c1'),
      ]);
      vi.mocked(mockRuns.findGradesByTrials).mockResolvedValue([
        grade('t1', 'pass'),
        grade('t1', 'fail', {
          graderId: 'judge',
          graderKind: 'judge',
          judgeModel: 'opus',
        }),
      ]);
      vi.mocked(mockCalibrations.findByGrader).mockResolvedValue([
        calibration({ id: 'new', status: 'non_gating' }),
        calibration({ id: 'old', status: 'gating' }),
      ]);

      const report = await resolver.evalRunReport('r1');
      const judge = report.graders.find((grader) => {
        return grader.graderId === 'judge';
      });

      expect(judge).toMatchObject({
        calibrationStatus: 'non_gating',
        counts: false,
        kappa: 0.7,
      });
      expect(report.numbers.passRate).toBe(1);
    });

    test('is not found for a missing run', async () => {
      vi.mocked(mockRuns.findRunById).mockResolvedValue(null);

      await expect(resolver.evalRunReport('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('evalRunComparison', () => {
    test('lists regressed cases and warns about a different dataset', async () => {
      vi.mocked(mockRuns.findRunById).mockImplementation(async (id) => {
        return id === 'base'
          ? run({ id: 'base' })
          : run({ datasetVersion: 2, id: 'cand' });
      });
      vi.mocked(mockRuns.findTrialsByRun).mockImplementation(async (id) => {
        return [trial(`${id}-1`, 'c1', id), trial(`${id}-2`, 'c2', id)];
      });
      vi.mocked(mockRuns.findGradesByTrials).mockImplementation(async (ids) => {
        const candidate = ids[0]?.startsWith('cand') === true;

        return [
          grade(ids[0] ?? '', candidate ? 'fail' : 'pass'),
          grade(ids[1] ?? '', 'pass'),
        ];
      });

      const comparison = await resolver.evalRunComparison('base', 'cand');

      expect(comparison.regressedCaseIds).toEqual(['c1']);
      expect(comparison.improvedCaseIds).toEqual([]);
      expect(comparison.mcnemar).toMatchObject({ b: 1, c: 0 });
      expect(
        comparison.warnings.map((warning) => {
          return warning.code;
        }),
      ).toEqual(['dataset_differs']);
    });
  });
});
