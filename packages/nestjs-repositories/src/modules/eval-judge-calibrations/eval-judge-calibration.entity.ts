/**
 * @description TypeORM entity for the OpenThrottle eval_judge_calibrations table (one measurement
 * of a judge against human labels). Matches databases/openthrottle/migrations (148).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { EvalSplit } from '../eval-datasets/eval-datasets.types.ts';
import type { EvalCalibrationStatus } from './eval-judge-calibrations.types.ts';

@Entity('eval_judge_calibrations')
export class EvalJudgeCalibration {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'grader_id', type: 'text' })
  graderId!: string;

  @Column({ name: 'grader_version', type: 'text' })
  graderVersion!: string;

  @Column({ name: 'judge_driver', nullable: true, type: 'text' })
  judgeDriver!: string | null;

  @Column({ name: 'judge_model', type: 'text' })
  judgeModel!: string;

  @Column({ name: 'judge_model_version', nullable: true, type: 'text' })
  judgeModelVersion!: string | null;

  @Column({ name: 'dataset_id', nullable: true, type: 'uuid' })
  datasetId!: string | null;

  @Column({ name: 'split', nullable: true, type: 'text' })
  split!: EvalSplit | null;

  @Column({ name: 'run_id', nullable: true, type: 'uuid' })
  runId!: string | null;

  @Column({ name: 'n', type: 'integer' })
  n!: number;

  @Column({ name: 'n_excluded', type: 'integer' })
  nExcluded!: number;

  @Column({ name: 'kappa', nullable: true, type: 'double precision' })
  kappa!: number | null;

  @Column({ name: 'kappa_ci_low', nullable: true, type: 'double precision' })
  kappaCiLow!: number | null;

  @Column({ name: 'kappa_ci_high', nullable: true, type: 'double precision' })
  kappaCiHigh!: number | null;

  @Column({ name: 'catch_rate', nullable: true, type: 'double precision' })
  catchRate!: number | null;

  @Column({ name: 'false_fail_rate', nullable: true, type: 'double precision' })
  falseFailRate!: number | null;

  @Column({ name: 'status', type: 'text' })
  status!: EvalCalibrationStatus;

  @Column({ name: 'held_out', type: 'boolean' })
  heldOut!: boolean;

  @Column({ name: 'created_by', type: 'text' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;
}
