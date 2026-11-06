/**
 * @description TypeORM entity for the OpenThrottle eval_runs table (one configuration executed over
 * a dataset). Matches databases/migrations (147).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { EvalDataset } from '../eval-datasets/eval-dataset.entity.ts';
import type { EvalAuthMode, EvalRunStatus } from './eval-runs.types.ts';
import { nullableNumberColumn } from './eval-runs.utils.ts';
import type { EvalTrial } from './eval-trial.entity.ts';

@Entity('eval_runs')
export class EvalRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne('EvalDataset', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dataset_id' })
  dataset?: EvalDataset;

  @OneToMany('EvalTrial', 'run')
  trials?: EvalTrial[];
}
