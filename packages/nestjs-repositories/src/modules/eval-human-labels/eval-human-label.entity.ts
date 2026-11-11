/**
 * @description TypeORM entity for the OpenThrottle eval_human_labels table (one rater's verdict on
 * one agent trajectory). Matches databases/openthrottle/migrations (146).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { AgentTrajectory } from '../agent-trajectories/agent-trajectory.entity.ts';
import type { EvalLabelVerdict } from './eval-human-labels.types.ts';

@Entity('eval_human_labels')
export class EvalHumanLabel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt!: Date;

  @ManyToOne('AgentTrajectory', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trajectory_id' })
  trajectory?: AgentTrajectory;
}
