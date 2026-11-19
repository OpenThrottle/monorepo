/**
 * @description Types for human trajectory labels (eval_human_labels, migrations 146, 181) shared
 * by EvalHumanLabelsRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { EvalHumanLabel } from './eval-human-label.entity.ts';
import type { EVAL_LABEL_VERDICT } from './eval-human-labels.constants.ts';
import type { EvalHumanLabelsRepository } from './eval-human-labels.repository.ts';

/** @public */
export type EvalLabelVerdict =
  (typeof EVAL_LABEL_VERDICT)[keyof typeof EVAL_LABEL_VERDICT];

/**
 * @description Everything needed to record or replace one rater's label on a trajectory.
 * @public
 */
export interface UpsertEvalHumanLabelInput {
  readonly failureType: string | null;
  readonly note: string | null;
  readonly rater: string;
  readonly trajectoryId: string;
  readonly verdict: EvalLabelVerdict;
}

/**
 * @description Identifies one rater's label on one trajectory.
 * @public
 */
export interface RemoveEvalHumanLabelInput {
  readonly rater: string;
  readonly trajectoryId: string;
}

/**
 * @description An {@link EvalHumanLabelsRepository} mock: every inherited `BaseRepository` method
 * plus the label ones.
 * @public
 */
export interface EvalHumanLabelsRepositoryMock extends BaseRepositoryMock<
  EvalHumanLabel,
  CreateModelInput<EvalHumanLabel>
> {
  readonly findByTrajectory: Mock<
    EvalHumanLabelsRepository['findByTrajectory']
  >;
  readonly removeLabel: Mock<EvalHumanLabelsRepository['removeLabel']>;
  readonly upsert: Mock<EvalHumanLabelsRepository['upsert']>;
}
