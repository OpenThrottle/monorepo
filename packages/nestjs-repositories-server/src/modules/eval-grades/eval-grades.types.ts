/**
 * @description Types for eval grades (eval_grades, migrations 147, 181) shared by
 * EvalGradesRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { EvalGrade } from './eval-grade.entity.ts';
import type {
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
} from './eval-grades.constants.ts';
import type { EvalGradesRepository } from './eval-grades.repository.ts';

/**
 * @description A JSON value as stored in a JSONB column. Typed shallowly (any object) on purpose:
 * the recursive JSON type makes TypeORM's QueryDeepPartialEntity instantiate infinitely.
 * @public
 */
export type EvalJsonValue = boolean | number | object | string | null;

/** @public */
export type EvalGradeVerdict =
  (typeof EVAL_GRADE_VERDICT)[keyof typeof EVAL_GRADE_VERDICT];

/** @public */
export type EvalGraderKind =
  (typeof EVAL_GRADER_KIND)[keyof typeof EVAL_GRADER_KIND];

/**
 * @description Everything needed to record one grader's verdict on a trial. A re-record of the
 * same (trial, grader id, grader version) replaces the earlier row.
 * @public
 */
export interface UpsertEvalGradeInput {
  readonly cacheKey: string | null;
  readonly costUsd: number | null;
  readonly errorReason: string | null;
  readonly evidence: EvalJsonValue;
  readonly graderId: string;
  readonly graderKind: EvalGraderKind;
  readonly graderVersion: string;
  readonly judgeDriver: string | null;
  readonly judgeModel: string | null;
  readonly judgeModelVersion: string | null;
  readonly trialId: string;
  readonly verdict: EvalGradeVerdict;
}

/**
 * @description An {@link EvalGradesRepository} mock: every inherited `BaseRepository` method plus
 * the grade ones.
 * @public
 */
export interface EvalGradesRepositoryMock extends BaseRepositoryMock<
  EvalGrade,
  CreateModelInput<EvalGrade>
> {
  readonly findByTrials: Mock<EvalGradesRepository['findByTrials']>;
  readonly upsertGrade: Mock<EvalGradesRepository['upsertGrade']>;
}
