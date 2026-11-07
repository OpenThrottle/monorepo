/**
 * @description TypeORM entity for the OpenThrottle eval_trials table (one attempt at one case,
 * linked to its agent trajectory). Matches databases/migrations (147).
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

import type { AgentTrajectory } from '../agent-trajectories/agent-trajectory.entity.ts';
import type { EvalCase } from '../eval-datasets/eval-case.entity.ts';
import type { EvalGrade } from './eval-grade.entity.ts';
import type { EvalRun } from './eval-run.entity.ts';
import type { EvalTrialStatus } from './eval-runs.types.ts';
import { nullableNumberColumn } from './eval-runs.utils.ts';

@Entity('eval_trials')
export class EvalTrial {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'run_id', type: 'uuid' })
  runId!: string;

  @Column({ name: 'case_id', type: 'uuid' })
  caseId!: string;

  @Column({ name: 'attempt', type: 'integer' })
  attempt!: number;

  @Column({ name: 'trajectory_id', nullable: true, type: 'uuid' })
  trajectoryId!: string | null;

  @Column({ name: 'status', type: 'text' })
  status!: EvalTrialStatus;

  @Column({ name: 'error', nullable: true, type: 'text' })
  error!: string | null;

  @Column({
    name: 'cost_usd',
    nullable: true,
    precision: 12,
    scale: 6,
    transformer: nullableNumberColumn(),
    type: 'numeric',
  })
  costUsd!: number | null;

  @Column({ name: 'duration_ms', nullable: true, type: 'integer' })
  durationMs!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne('EvalRun', 'trials', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run?: EvalRun;

  @ManyToOne('EvalCase', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'case_id' })
  evalCase?: EvalCase;

  @ManyToOne('AgentTrajectory', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'trajectory_id' })
  trajectory?: AgentTrajectory | null;

  @OneToMany('EvalGrade', 'trial')
  grades?: EvalGrade[];
}
