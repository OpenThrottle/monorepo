/**
 * @description TypeORM entity for the OpenThrottle eval_grades table (one grader's verdict on one
 * trial). Matches databases/openthrottle/migrations (147).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type {
  EvalGraderKind,
  EvalGradeVerdict,
  EvalJsonValue,
} from './eval-runs.types.ts';
import { nullableNumberColumn } from './eval-runs.utils.ts';
import type { EvalTrial } from './eval-trial.entity.ts';

@Entity('eval_grades')
export class EvalGrade {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne('EvalTrial', 'grades', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trial_id' })
  trial?: EvalTrial;
}
