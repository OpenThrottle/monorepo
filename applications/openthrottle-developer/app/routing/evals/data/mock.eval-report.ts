/**
 * @description Fixtures for the eval report and compare specs: a baseline and a
 * candidate report over the same three cases (one regressed, one improved, one
 * unchanged), and a run list row.
 */
import type {
  EvalRunListRowFragment,
  EvalRunReportFieldsFragment,
} from '~/__generated__/graphql';

const RUN_BASE = {
  authMode: 'api_key',
  budgetTokens: null,
  budgetUsd: 5,
  createdAt: '2026-11-06T08:00:00.000Z',
  datasetId: 'dataset-1',
  datasetVersion: 2,
  driver: 'claude',
  effort: 'high',
  finishedAt: '2026-11-06T09:00:00.000Z',
  id: 'run-base',
  k: 3,
  model: 'opus',
  promptSha: 'a1b2c3d4e5f6',
  skillSha: null,
  startedAt: '2026-11-06T08:05:00.000Z',
  status: 'completed',
} as const;

const GRADERS = [
  {
    calibrationStatus: null,
    counts: true,
    graderId: 'tests-pass',
    graderKind: 'code',
    graderVersion: '1',
    judgeModel: null,
    judgeModelVersion: null,
    kappa: null,
    kappaCiHigh: null,
    kappaCiLow: null,
  },
  {
    calibrationStatus: 'gating',
    counts: true,
    graderId: 'follows-plan',
    graderKind: 'judge',
    graderVersion: '3',
    judgeModel: 'opus',
    judgeModelVersion: null,
    kappa: 0.72,
    kappaCiHigh: 0.88,
    kappaCiLow: 0.51,
  },
  {
    calibrationStatus: null,
    counts: false,
    graderId: 'reviewer',
    graderKind: 'human',
    graderVersion: '1',
    judgeModel: null,
    judgeModelVersion: null,
    kappa: null,
    kappaCiHigh: null,
    kappaCiLow: null,
  },
] as const;

export const MOCK_REPORT_BASE: EvalRunReportFieldsFragment = {
  cases: [
    {
      attemptsCounted: 3,
      attemptsPassed: 3,
      caseId: 'case-aaaaaaaa-1',
      passed: true,
      split: 'dev',
    },
    {
      attemptsCounted: 3,
      attemptsPassed: 0,
      caseId: 'case-bbbbbbbb-2',
      passed: false,
      split: 'dev',
    },
    {
      attemptsCounted: 3,
      attemptsPassed: 3,
      caseId: 'case-cccccccc-3',
      passed: true,
      split: 'test',
    },
  ],
  datasetName: 'plan-failures',
  graders: [...GRADERS],
  numbers: {
    casesAtK: 3,
    casesCounted: 3,
    costPerSuccessUsd: 1.5,
    detectionFloor: 0.28,
    excluded: { errored: 0, gradeError: 0, noCountedGrade: 0, usageLimited: 2 },
    judgeAgreement: {
      graderId: 'follows-plan',
      graderVersion: '3',
      kappa: 0.72,
      kappaCiHigh: 0.88,
      kappaCiLow: 0.51,
      status: 'gating',
    },
    passAtK: 0.67,
    passHatK: 0.67,
    passRate: 0.67,
    passRateCi: { confidence: 0.95, lower: 0.44, upper: 0.89 },
    totalCostUsd: 13.5,
    trialsCounted: 9,
    trialsExcluded: 2,
    trialsPassed: 6,
  },
  run: RUN_BASE,
};

export const MOCK_REPORT_CANDIDATE: EvalRunReportFieldsFragment = {
  ...MOCK_REPORT_BASE,
  cases: [
    {
      attemptsCounted: 3,
      attemptsPassed: 1,
      caseId: 'case-aaaaaaaa-1',
      passed: false,
      split: 'dev',
    },
    {
      attemptsCounted: 3,
      attemptsPassed: 3,
      caseId: 'case-bbbbbbbb-2',
      passed: true,
      split: 'dev',
    },
    {
      attemptsCounted: 3,
      attemptsPassed: 3,
      caseId: 'case-cccccccc-3',
      passed: true,
      split: 'test',
    },
  ],
  run: { ...RUN_BASE, id: 'run-candidate', model: 'sonnet' },
};

export const MOCK_RUN_ROW: EvalRunListRowFragment = {
  authMode: RUN_BASE.authMode,
  createdAt: RUN_BASE.createdAt,
  datasetId: RUN_BASE.datasetId,
  datasetVersion: RUN_BASE.datasetVersion,
  driver: RUN_BASE.driver,
  effort: RUN_BASE.effort,
  finishedAt: RUN_BASE.finishedAt,
  id: RUN_BASE.id,
  k: RUN_BASE.k,
  model: RUN_BASE.model,
  promptSha: RUN_BASE.promptSha,
  skillSha: RUN_BASE.skillSha,
  startedAt: RUN_BASE.startedAt,
  status: RUN_BASE.status,
};
