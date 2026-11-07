import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import {
  type EvalJudgeCalibration,
  EvalJudgeCalibrationsService,
  type EvalJudgePair,
  type EvalJudgePairs,
  type EvalRun,
  EvalRunsService,
} from '@openthrottle/nestjs-repositories';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { EvalJudgeCalibrationsResolver } from './eval-judge-calibrations.resolver.ts';

const mockCalibrations = createMock<EvalJudgeCalibrationsService>({
  findByGrader: vi.fn(),
  findJudgePairs: vi.fn(),
  record: vi.fn(),
});
const mockRuns = createMock<EvalRunsService>({ findRunById: vi.fn() });
const mockCls = createMock<GlobalClsService>({ get: vi.fn() });

const at = new Date('2026-11-06T08:00:00.000Z');

const calibrationFactory = {
  build: (
    overrides: Partial<EvalJudgeCalibration> = {},
  ): EvalJudgeCalibration => {
    return {
      catchRate: 0.75,
      createdAt: at,
      createdBy: 'visormatt',
      datasetId: 'd1',
      falseFailRate: 0.1,
      graderId: 'g',
      graderVersion: '1',
      heldOut: false,
      id: 'c1',
      judgeDriver: 'claude',
      judgeModel: 'm',
      judgeModelVersion: null,
      kappa: 0.68,
      kappaCiHigh: 0.9,
      kappaCiLow: 0.4,
      n: 20,
      nExcluded: 0,
      runId: 'r1',
      split: 'dev',
      status: 'gating',
      ...overrides,
    };
  },
};

const runFactory = {
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
      status: 'completed',
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

const recordInput = {
  catchRate: 0.75,
  datasetId: 'd1',
  falseFailRate: 0.1,
  graderId: 'g',
  graderVersion: '1',
  heldOut: false,
  judgeDriver: 'claude',
  judgeModel: ' m ',
  judgeModelVersion: null,
  kappa: 0.68,
  kappaCiHigh: 0.9,
  kappaCiLow: 0.4,
  n: 20,
  nExcluded: 1,
  runId: null,
  split: 'dev',
  status: 'gating',
};

const runInput = {
  graderId: 'g',
  graderVersion: '1',
  heldOut: false,
  runId: 'r1',
  split: null,
};

// Table from the agentic-evals test: 6 fail/fail, 11 pass/pass, 1 judge-fail/human-pass,
// 2 judge-pass/human-fail, plus one judge error.
const pairsFor = (): EvalJudgePair[] => {
  const rows: Array<readonly ['fail' | 'pass', 'fail' | 'pass', number]> = [
    ['fail', 'fail', 6],
    ['pass', 'pass', 11],
    ['fail', 'pass', 1],
    ['pass', 'fail', 2],
  ];
  const pairs: EvalJudgePair[] = [];

  for (const [judge, human, times] of rows) {
    for (let i = 0; i < times; i += 1) {
      pairs.push({
        errorReason: null,
        evidence: 'quoted',
        human,
        judge,
        subjectId: `${judge}-${human}-${i}`,
      });
    }
  }

  pairs.push({
    errorReason: 'timeout',
    evidence: null,
    human: 'fail',
    judge: 'error',
    subjectId: 'error-0',
  });

  return pairs;
};

const judgePairs = (
  overrides: Partial<EvalJudgePairs> = {},
): EvalJudgePairs => {
  return {
    judges: [{ driver: 'claude', model: 'm', modelVersion: '2026-01' }],
    nConflicted: 2,
    nUnlabeled: 3,
    pairs: pairsFor(),
    ...overrides,
  };
};

describe('EvalJudgeCalibrationsResolver', () => {
  let resolver: EvalJudgeCalibrationsResolver;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(mockCls.get).mockReturnValue({
      displayName: 'visormatt',
      email: 'visormatt@example.com',
      isDeleted: false,
      roles: [],
      uuid: 'u1',
    });
    vi.mocked(mockCalibrations.record).mockResolvedValue(
      calibrationFactory.build(),
    );

    const app = await Test.createTestingModule({
      providers: [
        EvalJudgeCalibrationsResolver,
        { provide: EvalJudgeCalibrationsService, useValue: mockCalibrations },
        { provide: EvalRunsService, useValue: mockRuns },
        { provide: GlobalClsService, useValue: mockCls },
      ],
    }).compile();

    resolver = app.get(EvalJudgeCalibrationsResolver);
  });

  describe('judgeCalibrations', () => {
    test('lists the grader calibrations', async () => {
      vi.mocked(mockCalibrations.findByGrader).mockResolvedValue([
        calibrationFactory.build(),
      ]);

      const result = await resolver.judgeCalibrations('g');

      expect(mockCalibrations.findByGrader).toHaveBeenCalledWith('g');
      expect(result[0]).toEqual(
        expect.objectContaining({ id: 'c1', kappa: 0.68, status: 'gating' }),
      );
    });
  });

  describe('recordJudgeCalibration', () => {
    test('stamps the creator and trims the judge model', async () => {
      await resolver.recordJudgeCalibration(recordInput, undefined);

      expect(mockCalibrations.record).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'visormatt',
          judgeModel: 'm',
          split: 'dev',
          status: 'gating',
        }),
      );
    });

    describe('validation', () => {
      test.each([
        ['an unknown status', { status: 'trusted' }],
        ['a blank judge model', { judgeModel: '  ' }],
        ['a blank grader id', { graderId: ' ' }],
        ['an unknown split', { split: 'train' }],
        ['a split without a dataset', { datasetId: null }],
        ['a negative n', { n: -1 }],
        ['a catch rate above 1', { catchRate: 1.2 }],
        ['a negative false-fail rate', { falseFailRate: -0.1 }],
      ])('rejects %s', async (_name, override) => {
        await expect(
          resolver.recordJudgeCalibration(
            { ...recordInput, ...override },
            undefined,
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockCalibrations.record).not.toHaveBeenCalled();
      });

      test('accepts null rates and no split', async () => {
        await resolver.recordJudgeCalibration(
          {
            ...recordInput,
            catchRate: null,
            falseFailRate: null,
            kappa: null,
            split: null,
          },
          undefined,
        );

        expect(mockCalibrations.record).toHaveBeenCalledOnce();
      });
    });

    test('maps a foreign-key violation to NotFound', async () => {
      vi.mocked(mockCalibrations.record).mockRejectedValue(fkError());

      await expect(
        resolver.recordJudgeCalibration(recordInput, undefined),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('rethrows any other failure', async () => {
      vi.mocked(mockCalibrations.record).mockRejectedValue(new Error('boom'));

      await expect(
        resolver.recordJudgeCalibration(recordInput, undefined),
      ).rejects.toThrow('boom');
    });
  });

  describe('calibrateJudgeForRun', () => {
    beforeEach(() => {
      vi.mocked(mockRuns.findRunById).mockResolvedValue(runFactory.build());
      vi.mocked(mockCalibrations.findJudgePairs).mockResolvedValue(
        judgePairs(),
      );
    });

    test('computes the hand-computed table and records it', async () => {
      const result = await resolver.calibrateJudgeForRun(runInput, undefined);
      const [recorded] = vi.mocked(mockCalibrations.record).mock.calls[0] ?? [];

      expect(recorded?.n).toBe(20);
      expect(recorded?.nExcluded).toBe(1);
      expect(recorded?.catchRate).toBeCloseTo(0.75, 12);
      expect(recorded?.falseFailRate).toBeCloseTo(1 / 12, 12);
      expect(recorded?.kappa).toBeCloseTo(0.32 / 0.47, 12);
      expect(recorded?.status).toBe('gating');
      expect(result.nConflicted).toBe(2);
      expect(result.nUnlabeled).toBe(3);
    });

    test('records the run, dataset, judge identity and creator', async () => {
      await resolver.calibrateJudgeForRun(
        { ...runInput, heldOut: true, split: 'dev' },
        undefined,
      );

      expect(mockCalibrations.findJudgePairs).toHaveBeenCalledWith({
        graderId: 'g',
        graderVersion: '1',
        runId: 'r1',
        split: 'dev',
      });
      expect(mockCalibrations.record).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'visormatt',
          datasetId: 'd1',
          heldOut: true,
          judgeDriver: 'claude',
          judgeModel: 'm',
          judgeModelVersion: '2026-01',
          runId: 'r1',
          split: 'dev',
        }),
      );
    });

    test('is insufficient below the minimum number of pairs', async () => {
      vi.mocked(mockCalibrations.findJudgePairs).mockResolvedValue(
        judgePairs({ pairs: pairsFor().slice(0, 5) }),
      );

      await resolver.calibrateJudgeForRun(runInput, undefined);

      expect(mockCalibrations.record).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'insufficient' }),
      );
    });

    describe('when the run does not exist', () => {
      test('throws NotFound', async () => {
        vi.mocked(mockRuns.findRunById).mockResolvedValue(null);

        await expect(
          resolver.calibrateJudgeForRun(runInput, undefined),
        ).rejects.toBeInstanceOf(NotFoundException);
      });
    });

    describe('when there are no judge grades', () => {
      test('throws BadRequest', async () => {
        vi.mocked(mockCalibrations.findJudgePairs).mockResolvedValue(
          judgePairs({ judges: [], pairs: [] }),
        );

        await expect(
          resolver.calibrateJudgeForRun(runInput, undefined),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(mockCalibrations.record).not.toHaveBeenCalled();
      });
    });

    describe('when several judge models graded the run', () => {
      test('throws BadRequest', async () => {
        vi.mocked(mockCalibrations.findJudgePairs).mockResolvedValue(
          judgePairs({
            judges: [
              { driver: 'claude', model: 'a', modelVersion: null },
              { driver: 'claude', model: 'b', modelVersion: null },
            ],
          }),
        );

        await expect(
          resolver.calibrateJudgeForRun(runInput, undefined),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    test('rejects an unknown split', async () => {
      await expect(
        resolver.calibrateJudgeForRun(
          { ...runInput, split: 'train' },
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
