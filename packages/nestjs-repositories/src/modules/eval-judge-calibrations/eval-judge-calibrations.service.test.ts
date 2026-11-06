import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalCase } from '../eval-datasets/eval-case.entity.ts';
import { EvalHumanLabel } from '../eval-human-labels/eval-human-label.entity.ts';
import { EvalGrade } from '../eval-runs/eval-grade.entity.ts';
import {
  evalGradeFactory,
  evalTrialFactory,
} from '../eval-runs/eval-run.factory.ts';
import {
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
} from '../eval-runs/eval-runs.constants.ts';
import { EvalTrial } from '../eval-runs/eval-trial.entity.ts';
import { EvalJudgeCalibration } from './eval-judge-calibration.entity.ts';
import { evalJudgeCalibrationFactory } from './eval-judge-calibration.factory.ts';
import { EvalJudgeCalibrationsService } from './eval-judge-calibrations.service.ts';

describe('EvalJudgeCalibrationsService', () => {
  const mockCalibrationRepository = {
    create: vi.fn(),
    find: vi.fn(),
    save: vi.fn(),
  };
  const mockTrialRepository = { find: vi.fn() };
  const mockGradeRepository = { find: vi.fn() };
  const mockCaseRepository = { find: vi.fn() };
  const mockLabelRepository = { find: vi.fn() };

  let service: EvalJudgeCalibrationsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalJudgeCalibrationsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(EvalJudgeCalibration),
          useValue: mockCalibrationRepository,
        },
        {
          provide: getRepositoryToken(EvalTrial),
          useValue: mockTrialRepository,
        },
        {
          provide: getRepositoryToken(EvalGrade),
          useValue: mockGradeRepository,
        },
        { provide: getRepositoryToken(EvalCase), useValue: mockCaseRepository },
        {
          provide: getRepositoryToken(EvalHumanLabel),
          useValue: mockLabelRepository,
        },
      ],
    }).compile();

    service = app.get<EvalJudgeCalibrationsService>(
      EvalJudgeCalibrationsService,
    );
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCalibrationRepository.create.mockImplementation((row: object) => row);
    mockCalibrationRepository.save.mockImplementation(
      async (row: object) => row,
    );
  });

  const query = {
    graderId: 'g',
    graderVersion: '1',
    runId: 'r1',
    split: null,
  } as const;

  const judgeGrade = (trialId: string, verdict: 'error' | 'fail' | 'pass') => {
    return evalGradeFactory.build({
      errorReason: verdict === 'error' ? 'timeout' : null,
      graderId: 'g',
      graderKind: EVAL_GRADER_KIND.JUDGE,
      judgeDriver: 'claude',
      judgeModel: 'm',
      trialId,
      verdict,
    });
  };

  describe('record', () => {
    it('inserts the calibration as a new row', async () => {
      const { createdAt, id, ...input } = evalJudgeCalibrationFactory.build();

      await service.record(input);

      expect(mockCalibrationRepository.create).toHaveBeenCalledWith(input);
      expect(mockCalibrationRepository.save).toHaveBeenCalledOnce();
      expect(createdAt).toBeInstanceOf(Date);
      expect(id).toBeTypeOf('string');
    });
  });

  describe('findByGrader', () => {
    it('lists the grader calibrations newest first', async () => {
      mockCalibrationRepository.find.mockResolvedValue([]);

      await service.findByGrader('g');

      expect(mockCalibrationRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { graderId: 'g' },
      });
    });
  });

  describe('findJudgePairs', () => {
    it('returns nothing without querying grades when the run has no trials', async () => {
      mockTrialRepository.find.mockResolvedValue([]);

      const result = await service.findJudgePairs(query);

      expect(result).toEqual({
        judges: [],
        nConflicted: 0,
        nUnlabeled: 0,
        pairs: [],
      });
      expect(mockGradeRepository.find).not.toHaveBeenCalled();
    });

    it('pairs judge grades with the label on the trial trajectory', async () => {
      mockTrialRepository.find.mockResolvedValue([
        evalTrialFactory.build({ id: 't1', trajectoryId: 'j1' }),
        evalTrialFactory.build({ id: 't2', trajectoryId: 'j2' }),
      ]);
      mockGradeRepository.find.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.FAIL),
        judgeGrade('t2', EVAL_GRADE_VERDICT.ERROR),
      ]);
      mockLabelRepository.find.mockResolvedValue([
        { trajectoryId: 'j1', verdict: 'fail' },
        { trajectoryId: 'j2', verdict: 'pass' },
      ]);

      const result = await service.findJudgePairs(query);

      expect(
        result.pairs.map((pair) => [pair.subjectId, pair.judge, pair.human]),
      ).toEqual([
        ['t1', 'fail', 'fail'],
        ['t2', 'error', 'pass'],
      ]);
      expect(result.pairs[1]?.errorReason).toBe('timeout');
      expect(result.judges).toEqual([
        { driver: 'claude', model: 'm', modelVersion: null },
      ]);
    });

    it('counts trials without a trajectory or a label as unlabeled', async () => {
      mockTrialRepository.find.mockResolvedValue([
        evalTrialFactory.build({ id: 't1', trajectoryId: null }),
        evalTrialFactory.build({ id: 't2', trajectoryId: 'j2' }),
      ]);
      mockGradeRepository.find.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.PASS),
        judgeGrade('t2', EVAL_GRADE_VERDICT.PASS),
      ]);
      mockLabelRepository.find.mockResolvedValue([]);

      const result = await service.findJudgePairs(query);

      expect(result.pairs).toEqual([]);
      expect(result.nUnlabeled).toBe(2);
    });

    it('counts a trajectory whose raters disagree as conflicted', async () => {
      mockTrialRepository.find.mockResolvedValue([
        evalTrialFactory.build({ id: 't1', trajectoryId: 'j1' }),
      ]);
      mockGradeRepository.find.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.PASS),
      ]);
      mockLabelRepository.find.mockResolvedValue([
        { trajectoryId: 'j1', verdict: 'pass' },
        { trajectoryId: 'j1', verdict: 'fail' },
      ]);

      const result = await service.findJudgePairs(query);

      expect(result.pairs).toEqual([]);
      expect(result.nConflicted).toBe(1);
    });

    it('accepts several raters that agree', async () => {
      mockTrialRepository.find.mockResolvedValue([
        evalTrialFactory.build({ id: 't1', trajectoryId: 'j1' }),
      ]);
      mockGradeRepository.find.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.PASS),
      ]);
      mockLabelRepository.find.mockResolvedValue([
        { trajectoryId: 'j1', verdict: 'pass' },
        { trajectoryId: 'j1', verdict: 'pass' },
      ]);

      const result = await service.findJudgePairs(query);

      expect(result.pairs).toHaveLength(1);
    });

    it('reports every distinct judge identity', async () => {
      mockTrialRepository.find.mockResolvedValue([
        evalTrialFactory.build({ id: 't1', trajectoryId: 'j1' }),
        evalTrialFactory.build({ id: 't2', trajectoryId: 'j2' }),
      ]);
      mockGradeRepository.find.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.PASS),
        { ...judgeGrade('t2', EVAL_GRADE_VERDICT.PASS), judgeModel: 'other' },
      ]);
      mockLabelRepository.find.mockResolvedValue([]);

      const result = await service.findJudgePairs(query);

      expect(result.judges).toHaveLength(2);
    });

    describe('when a split is given', () => {
      it('keeps only the trials whose case is in the split', async () => {
        mockTrialRepository.find.mockResolvedValue([
          evalTrialFactory.build({
            caseId: 'c1',
            id: 't1',
            trajectoryId: 'j1',
          }),
          evalTrialFactory.build({
            caseId: 'c2',
            id: 't2',
            trajectoryId: 'j2',
          }),
        ]);
        mockCaseRepository.find.mockResolvedValue([{ id: 'c1' }]);
        mockGradeRepository.find.mockResolvedValue([
          judgeGrade('t1', EVAL_GRADE_VERDICT.FAIL),
        ]);
        mockLabelRepository.find.mockResolvedValue([
          { trajectoryId: 'j1', verdict: 'fail' },
        ]);

        const result = await service.findJudgePairs({ ...query, split: 'dev' });

        expect(result.pairs.map((pair) => pair.subjectId)).toEqual(['t1']);
      });

      it('returns nothing when no case is in the split', async () => {
        mockTrialRepository.find.mockResolvedValue([
          evalTrialFactory.build({ caseId: 'c1', id: 't1' }),
        ]);
        mockCaseRepository.find.mockResolvedValue([]);

        const result = await service.findJudgePairs({
          ...query,
          split: 'test',
        });

        expect(result.pairs).toEqual([]);
        expect(mockGradeRepository.find).not.toHaveBeenCalled();
      });
    });
  });
});
