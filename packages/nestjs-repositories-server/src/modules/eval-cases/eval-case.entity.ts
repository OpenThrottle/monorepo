/**
 * @description TypeORM entity for the openthrottle `eval_cases` table: one input with its gold
 * answer. Extends `BaseModel`, so a delete is a soft delete through `deleted_at`; trials that ran
 * a deleted case keep its `case_id`. Matches databases/openthrottle/migrations (147, 181).
 * @public
 */

import { BaseModel } from '@openthrottle/nestjs-postgres';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import type { AgentTrajectory } from '../agent-trajectories/agent-trajectory.entity.ts';
import type { EvalDataset } from '../eval-datasets/eval-dataset.entity.ts';
import type { EvalSplit } from '../eval-datasets/eval-datasets.types.ts';

@Entity('eval_cases')
export class EvalCase extends BaseModel {
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

  @ManyToOne('EvalDataset', 'cases', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dataset_id' })
  dataset?: EvalDataset;

  @ManyToOne('AgentTrajectory', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_trajectory_id' })
  sourceTrajectory?: AgentTrajectory | null;
}
