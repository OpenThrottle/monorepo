/**
 * @description TypeORM entity for the openthrottle `eval_trials` table: one attempt at one case,
 * linked to its agent trajectory. Extends `BaseHardDeleteModel`: a trial is a recorded result,
 * never user-deleted; the only deletes are FK cascades from a removed run. A resumed run
 * re-records a trial in place, so the table keeps no `updated_at`. Matches
 * databases/openthrottle/migrations (147, 181).
 * @public
 */

import { BaseHardDeleteModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

import type { AgentTrajectory } from '../agent-trajectories/agent-trajectory.entity.ts';
import type { EvalCase } from '../eval-cases/eval-case.entity.ts';
import type { EvalGrade } from '../eval-grades/eval-grade.entity.ts';
import type { EvalRun } from '../eval-runs/eval-run.entity.ts';
import { nullableNumberColumn } from '../eval-runs/nullable-number-column/nullable-number-column.utils.ts';
import type { EvalTrialStatus } from './eval-trials.types.ts';

@Entity('eval_trials')
export class EvalTrial extends BaseHardDeleteModel {
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
