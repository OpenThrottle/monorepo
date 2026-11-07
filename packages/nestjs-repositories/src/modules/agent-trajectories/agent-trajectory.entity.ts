/**
 * @description TypeORM entity for the OpenThrottle agent_trajectories table (one ATIF v1.8 document
 * per agent run iteration). Matches databases/migrations (145).
 */

import type { AtifTrajectory } from '@openthrottle/openthrottle-agentic-utils';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { PlanRun } from '../plan-runs/plan-run.entity.ts';
import type { Task } from '../tasks/task.entity.ts';
import type { AgentTrajectorySource } from './agent-trajectories.types.ts';

/**
 * Postgres returns numeric as a string (to avoid precision loss). A run's cost fits comfortably in
 * a JS number, so it is read back as `number | null`; NULL stays NULL (unpriceable, not zero).
 */
const nullableNumberColumn = {
  from: (value: string | null): number | null =>
    value == null ? null : Number(value),
  to: (value: number | null): number | null => value,
};

@Entity('agent_trajectories')
export class AgentTrajectory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'plan_run_id', type: 'uuid' })
  planRunId!: string;

  @Column({ name: 'task_id', nullable: true, type: 'uuid' })
  taskId!: string | null;

  @Column({ name: 'source', type: 'text' })
  source!: AgentTrajectorySource;

  @Column({ name: 'driver', type: 'text' })
  driver!: string;

  @Column({ name: 'model', nullable: true, type: 'text' })
  model!: string | null;

  @Column({ name: 'schema_version', type: 'text' })
  schemaVersion!: string;

  @Column({ name: 'idempotency_key', nullable: true, type: 'text' })
  idempotencyKey!: string | null;

  @Column({ name: 'trajectory', type: 'jsonb' })
  trajectory!: AtifTrajectory;

  @Column({ default: 0, name: 'tool_call_count', type: 'integer' })
  toolCallCount!: number;

  @Column({ name: 'input_tokens', nullable: true, type: 'integer' })
  inputTokens!: number | null;

  @Column({ name: 'cached_tokens', nullable: true, type: 'integer' })
  cachedTokens!: number | null;

  @Column({ name: 'output_tokens', nullable: true, type: 'integer' })
  outputTokens!: number | null;

  @Column({
    name: 'cost_usd',
    nullable: true,
    precision: 12,
    scale: 6,
    transformer: nullableNumberColumn,
    type: 'numeric',
  })
  costUsd!: number | null;

  @Column({ name: 'duration_ms', nullable: true, type: 'integer' })
  durationMs!: number | null;

  @Column({ name: 'exit_code', nullable: true, type: 'integer' })
  exitCode!: number | null;

  @Column({ name: 'outcome', nullable: true, type: 'text' })
  outcome!: string | null;

  @Column({ name: 'byte_size', type: 'integer' })
  byteSize!: number;

  @Column({ default: false, name: 'truncated', type: 'boolean' })
  truncated!: boolean;

  @Column({ default: false, name: 'incomplete', type: 'boolean' })
  incomplete!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne('PlanRun', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_run_id' })
  planRun?: PlanRun;

  @ManyToOne('Task', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task?: Task | null;
}
