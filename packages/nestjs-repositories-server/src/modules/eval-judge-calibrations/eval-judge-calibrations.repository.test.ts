import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { evalCasesFactory } from '../eval-cases/eval-cases.factory.ts';
import { EvalCasesRepository } from '../eval-cases/eval-cases.repository.ts';
import { createEvalCasesRepositoryMock } from '../eval-cases/eval-cases.utils.ts';
import {
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
} from '../eval-grades/eval-grades.constants.ts';
import { evalGradesFactory } from '../eval-grades/eval-grades.factory.ts';
import { EvalGradesRepository } from '../eval-grades/eval-grades.repository.ts';
import { createEvalGradesRepositoryMock } from '../eval-grades/eval-grades.utils.ts';
import { evalHumanLabelsFactory } from '../eval-human-labels/eval-human-labels.factory.ts';
import { EvalHumanLabelsRepository } from '../eval-human-labels/eval-human-labels.repository.ts';
import { createEvalHumanLabelsRepositoryMock } from '../eval-human-labels/eval-human-labels.utils.ts';
import { evalTrialsFactory } from '../eval-trials/eval-trials.factory.ts';
import { EvalTrialsRepository } from '../eval-trials/eval-trials.repository.ts';
import { createEvalTrialsRepositoryMock } from '../eval-trials/eval-trials.utils.ts';
import { EvalJudgeCalibration } from './eval-judge-calibration.entity.ts';
import { evalJudgeCalibrationsFactory } from './eval-judge-calibrations.factory.ts';
import { EvalJudgeCalibrationsRepository } from './eval-judge-calibrations.repository.ts';

describe('EvalJudgeCalibrationsRepository', () => {
  const mockCalibrationRepository = {
    create: vi.fn(),
    find: vi.fn(),
    save: vi.fn(),
    target: EvalJudgeCalibration,
  };
  const trials = createEvalTrialsRepositoryMock();
  const grades = createEvalGradesRepositoryMock();
  const cases = createEvalCasesRepositoryMock();
  const labels = createEvalHumanLabelsRepositoryMock();

  let repository: EvalJudgeCalibrationsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalJudgeCalibrationsRepository,
        {
          provide: getRepositoryToken(EvalJudgeCalibration),
          useValue: mockCalibrationRepository,
        },
        { provide: EvalTrialsRepository, useValue: trials },
        { provide: EvalGradesRepository, useValue: grades },
        { provide: EvalCasesRepository, useValue: cases },
        { provide: EvalHumanLabelsRepository, useValue: labels },
      ],
    }).compile();

    repository = app.get(EvalJudgeCalibrationsRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCalibrationRepository.create.mockImplementation((row: object) => row);
    mockCalibrationRepository.save.mockImplementation(
      async (row: object) => row,
    );
    trials.findBy.mockResolvedValue([]);
    grades.findBy.mockResolvedValue([]);
    cases.findBy.mockResolvedValue([]);
    labels.findBy.mockResolvedValue([]);
  });

  const query = {
    graderId: 'g',
    graderVersion: '1',
    runId: 'r1',
    split: null,
  } as const;

  const judgeGrade = (trialId: string, verdict: 'error' | 'fail' | 'pass') => {
    return evalGradesFactory.build({
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
      const { createdAt, id, ...input } = evalJudgeCalibrationsFactory.build();

      await repository.record(input);

      expect(mockCalibrationRepository.create).toHaveBeenCalledWith(input);
      expect(mockCalibrationRepository.save).toHaveBeenCalledOnce();
      expect(createdAt).toBeInstanceOf(Date);
      expect(id).toBeTypeOf('string');
    });
  });

  describe('findByGrader', () => {
    it('lists the grader calibrations newest first', async () => {
      mockCalibrationRepository.find.mockResolvedValue([]);

      await repository.findByGrader('g');

      expect(mockCalibrationRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        where: { graderId: 'g' },
      });
    });
  });

  describe('findJudgePairs', () => {
    it('returns nothing without querying grades when the run has no trials', async () => {
      trials.findBy.mockResolvedValue([]);

      const result = await repository.findJudgePairs(query);

      expect(result).toEqual({
        judges: [],
        nConflicted: 0,
        nUnlabeled: 0,
        pairs: [],
      });
      expect(grades.findBy).not.toHaveBeenCalled();
    });

    it('pairs judge grades with the label on the trial trajectory', async () => {
      trials.findBy.mockResolvedValue([
        evalTrialsFactory.build({ id: 't1', trajectoryId: 'j1' }),
        evalTrialsFactory.build({ id: 't2', trajectoryId: 'j2' }),
      ]);
      grades.findBy.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.FAIL),
        judgeGrade('t2', EVAL_GRADE_VERDICT.ERROR),
      ]);
      labels.findBy.mockResolvedValue([
        evalHumanLabelsFactory.build({ trajectoryId: 'j1', verdict: 'fail' }),
        evalHumanLabelsFactory.build({ trajectoryId: 'j2', verdict: 'pass' }),
      ]);

      const result = await repository.findJudgePairs(query);

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
      trials.findBy.mockResolvedValue([
        evalTrialsFactory.build({ id: 't1', trajectoryId: null }),
        evalTrialsFactory.build({ id: 't2', trajectoryId: 'j2' }),
      ]);
      grades.findBy.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.PASS),
        judgeGrade('t2', EVAL_GRADE_VERDICT.PASS),
      ]);
      labels.findBy.mockResolvedValue([]);

      const result = await repository.findJudgePairs(query);

      expect(result.pairs).toEqual([]);
      expect(result.nUnlabeled).toBe(2);
    });

    it('counts a trajectory whose raters disagree as conflicted', async () => {
      trials.findBy.mockResolvedValue([
        evalTrialsFactory.build({ id: 't1', trajectoryId: 'j1' }),
      ]);
      grades.findBy.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.PASS),
      ]);
      labels.findBy.mockResolvedValue([
        evalHumanLabelsFactory.build({ trajectoryId: 'j1', verdict: 'pass' }),
        evalHumanLabelsFactory.build({ trajectoryId: 'j1', verdict: 'fail' }),
      ]);

      const result = await repository.findJudgePairs(query);

      expect(result.pairs).toEqual([]);
      expect(result.nConflicted).toBe(1);
    });

    it('accepts several raters that agree', async () => {
      trials.findBy.mockResolvedValue([
        evalTrialsFactory.build({ id: 't1', trajectoryId: 'j1' }),
      ]);
      grades.findBy.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.PASS),
      ]);
      labels.findBy.mockResolvedValue([
        evalHumanLabelsFactory.build({ trajectoryId: 'j1', verdict: 'pass' }),
        evalHumanLabelsFactory.build({ trajectoryId: 'j1', verdict: 'pass' }),
      ]);

      const result = await repository.findJudgePairs(query);

      expect(result.pairs).toHaveLength(1);
    });

    it('reports every distinct judge identity', async () => {
      trials.findBy.mockResolvedValue([
        evalTrialsFactory.build({ id: 't1', trajectoryId: 'j1' }),
        evalTrialsFactory.build({ id: 't2', trajectoryId: 'j2' }),
      ]);
      grades.findBy.mockResolvedValue([
        judgeGrade('t1', EVAL_GRADE_VERDICT.PASS),
        { ...judgeGrade('t2', EVAL_GRADE_VERDICT.PASS), judgeModel: 'other' },
      ]);
      labels.findBy.mockResolvedValue([]);

      const result = await repository.findJudgePairs(query);

      expect(result.judges).toHaveLength(2);
    });

    describe('when a split is given', () => {
      it('keeps only the trials whose case is in the split', async () => {
        trials.findBy.mockResolvedValue([
          evalTrialsFactory.build({
            caseId: 'c1',
            id: 't1',
            trajectoryId: 'j1',
          }),
          evalTrialsFactory.build({
            caseId: 'c2',
            id: 't2',
            trajectoryId: 'j2',
          }),
        ]);
        cases.findBy.mockResolvedValue([evalCasesFactory.build({ id: 'c1' })]);
        grades.findBy.mockResolvedValue([
          judgeGrade('t1', EVAL_GRADE_VERDICT.FAIL),
        ]);
        labels.findBy.mockResolvedValue([
          evalHumanLabelsFactory.build({ trajectoryId: 'j1', verdict: 'fail' }),
        ]);

        const result = await repository.findJudgePairs({
          ...query,
          split: 'dev',
        });

        expect(result.pairs.map((pair) => pair.subjectId)).toEqual(['t1']);
      });

      it('returns nothing when no case is in the split', async () => {
        trials.findBy.mockResolvedValue([
          evalTrialsFactory.build({ caseId: 'c1', id: 't1' }),
        ]);
        cases.findBy.mockResolvedValue([]);

        const result = await repository.findJudgePairs({
          ...query,
          split: 'test',
        });

        expect(result.pairs).toEqual([]);
        expect(grades.findBy).not.toHaveBeenCalled();
      });
    });
  });
});
