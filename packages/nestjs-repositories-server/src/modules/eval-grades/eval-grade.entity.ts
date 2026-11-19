/**
 * @description TypeORM entity for the openthrottle `eval_grades` table: one grader's verdict on
 * one trial. Extends `BaseHardDeleteModel`: a grade is a recorded result, never user-deleted; the
 * only deletes are FK cascades from a removed trial. Re-grading replaces the row in place, so the
 * table keeps no `updated_at`. Matches databases/openthrottle/migrations (147, 181).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { nullableNumberColumn } from '../eval-runs/nullable-number-column/nullable-number-column.utils.ts';
import type { EvalTrial } from '../eval-trials/eval-trial.entity.ts';
import type {
  EvalGraderKind,
  EvalGradeVerdict,
  EvalJsonValue,
} from './eval-grades.types.ts';

@Entity('eval_grades')
export class EvalGrade extends BaseHardDeleteModel {
  @Column({ name: 'trial_id', type: 'uuid' })
  trialId!: string;

  @Column({ name: 'grader_id', type: 'text' })
  graderId!: string;

  @Column({ name: 'grader_version', type: 'text' })
  graderVersion!: string;

  @Column({ name: 'grader_kind', type: 'text' })
  graderKind!: EvalGraderKind;

  @Column({ name: 'judge_driver', nullable: true, type: 'text' })
  judgeDriver!: string | null;

  @Column({ name: 'judge_model', nullable: true, type: 'text' })
  judgeModel!: string | null;

  @Column({ name: 'judge_model_version', nullable: true, type: 'text' })
  judgeModelVersion!: string | null;

  @Column({ name: 'verdict', type: 'text' })
  verdict!: EvalGradeVerdict;

  @Column({ name: 'evidence', nullable: true, type: 'jsonb' })
  evidence!: EvalJsonValue;

  @Column({ name: 'error_reason', nullable: true, type: 'text' })
  errorReason!: string | null;

  @Column({
    name: 'cost_usd',
    nullable: true,
    precision: 12,
    scale: 6,
    transformer: nullableNumberColumn(),
    type: 'numeric',
  })
  costUsd!: number | null;

  @Column({ name: 'cache_key', nullable: true, type: 'text' })
  cacheKey!: string | null;

  @ManyToOne('EvalTrial', 'grades', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trial_id' })
  trial?: EvalTrial;
}
