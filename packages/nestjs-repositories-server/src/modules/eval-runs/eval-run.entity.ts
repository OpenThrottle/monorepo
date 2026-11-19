/**
 * @description TypeORM entity for the openthrottle `eval_runs` table: one configuration executed
 * over a dataset. Extends `BaseHardDeleteModel`: a run is a recorded result, never user-deleted;
 * the only deletes are FK cascades from a removed dataset. Its status and timestamps are written
 * in place, and `started_at` / `finished_at` already say when, so the table keeps no
 * `updated_at`. Matches databases/openthrottle/migrations (147, 181).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import type { EvalDataset } from '../eval-datasets/eval-dataset.entity.ts';
import type { EvalTrial } from '../eval-trials/eval-trial.entity.ts';
import type { EvalAuthMode, EvalRunStatus } from './eval-runs.types.ts';
import { nullableNumberColumn } from './nullable-number-column/nullable-number-column.utils.ts';

@Entity('eval_runs')
export class EvalRun extends BaseHardDeleteModel {
  @Column({ name: 'dataset_id', type: 'uuid' })
  datasetId!: string;

  @Column({ name: 'dataset_version', type: 'integer' })
  datasetVersion!: number;

  @Column({ name: 'driver', type: 'text' })
  driver!: string;

  @Column({ name: 'model', nullable: true, type: 'text' })
  model!: string | null;

  @Column({ name: 'effort', nullable: true, type: 'text' })
  effort!: string | null;

  @Column({ name: 'prompt_sha', nullable: true, type: 'text' })
  promptSha!: string | null;

  @Column({ name: 'skill_sha', nullable: true, type: 'text' })
  skillSha!: string | null;

  @Column({ name: 'auth_mode', type: 'text' })
  authMode!: EvalAuthMode;

  @Column({ name: 'k', type: 'integer' })
  k!: number;

  @Column({ default: 'pending', name: 'status', type: 'text' })
  status!: EvalRunStatus;

  @Column({ name: 'budget_tokens', nullable: true, type: 'integer' })
  budgetTokens!: number | null;

  @Column({
    name: 'budget_usd',
    nullable: true,
    precision: 12,
    scale: 6,
    transformer: nullableNumberColumn(),
    type: 'numeric',
  })
  budgetUsd!: number | null;

  @Column({ name: 'created_by', type: 'text' })
  createdBy!: string;

  @Column({
    name: 'started_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  startedAt!: Date | null;

  @Column({
    name: 'finished_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  finishedAt!: Date | null;

  @ManyToOne('EvalDataset', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dataset_id' })
  dataset?: EvalDataset;

  @OneToMany('EvalTrial', 'run')
  trials?: EvalTrial[];
}
