/**
 * @description TypeORM entity for the OpenThrottle eval_cases table (one input with its gold
 * answer). Matches databases/migrations (147).
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { AgentTrajectory } from '../agent-trajectories/agent-trajectory.entity.ts';
import type { EvalDataset } from './eval-dataset.entity.ts';
import type { EvalSplit } from './eval-datasets.types.ts';

@Entity('eval_cases')
export class EvalCase {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'dataset_id', type: 'uuid' })
  datasetId!: string;

  @Column({ name: 'split', type: 'text' })
  split!: EvalSplit;

  @Column({ name: 'input', type: 'jsonb' })
  input!: unknown;

  @Column({ name: 'gold', type: 'jsonb' })
  gold!: unknown;

  @Column({ name: 'source_trajectory_id', nullable: true, type: 'uuid' })
  sourceTrajectoryId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne('EvalDataset', 'cases', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dataset_id' })
  dataset?: EvalDataset;

  @ManyToOne('AgentTrajectory', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_trajectory_id' })
  sourceTrajectory?: AgentTrajectory | null;
}
