/**
 * @description TypeORM entity for the openthrottle `eval_human_labels` table: one rater's verdict
 * on one agent trajectory. Extends `BaseModel`, so removing a label is a soft delete through
 * `deleted_at`. The unique index on (trajectory_id, rater) deliberately still covers soft-deleted
 * rows: re-labelling after a removal upserts on it and revives the row, keeping one row per
 * (trajectory, rater). Matches databases/openthrottle/migrations (146, 181).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { AgentTrajectory } from '../agent-trajectories/agent-trajectory.entity.ts';
import type { EvalLabelVerdict } from './eval-human-labels.types.ts';

@Entity('eval_human_labels')
export class EvalHumanLabel extends BaseModel {
  @Column({ name: 'trajectory_id', type: 'uuid' })
  trajectoryId!: string;

  @Column({ name: 'rater', type: 'text' })
  rater!: string;

  @Column({ name: 'verdict', type: 'text' })
  verdict!: EvalLabelVerdict;

  @Column({ name: 'failure_type', nullable: true, type: 'text' })
  failureType!: string | null;

  @Column({ name: 'note', nullable: true, type: 'text' })
  note!: string | null;

  @ManyToOne('AgentTrajectory', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trajectory_id' })
  trajectory?: AgentTrajectory;
}
