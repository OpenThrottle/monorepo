/**
 * @description TypeORM entity for the scheduled_agent_job_runs table (databases/migrations/082): the
 * append-only run history (status/timing/exit) for a scheduled_agent_jobs row. Run *logs* are not
 * here — they stream to the JSONL sink (queueJobLogs/queueJobLogTail), joined by `bullmqJobId`.
 */

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ScheduledAgentJobDriverId } from './scheduled-agent-job.entity';

/** queued (pre-created by run-now) -> running (claimed) -> succeeded | failed | cancelled. */
export type ScheduledAgentJobRunStatus =
  | 'cancelled'
  | 'failed'
  | 'queued'
  | 'running'
  | 'succeeded';

/** schedule = cron fire; manual = run-now. */
export type ScheduledAgentJobRunTrigger = 'manual' | 'schedule';

/** Scalar/column fields of ScheduledAgentJobRun surfaced to the API. */
export type ScheduledAgentJobRunData = Pick<
  ScheduledAgentJobRun,
  | 'bullmqJobId'
  | 'cancelRequestedAt'
  | 'createdAt'
  | 'driverId'
  | 'errorMessage'
  | 'exitCode'
  | 'finishedAt'
  | 'id'
  | 'model'
  | 'scheduledAgentJobId'
  | 'startedAt'
  | 'status'
  | 'trigger'
>;

@Entity('scheduled_agent_job_runs')
export class ScheduledAgentJobRun {
  /** BullMQ job id; the join key to queueJobLogs (queueName, jobId). Equals the run id for run-now. */
  @Column({ name: 'bullmq_job_id', nullable: true, type: 'text' })
  bullmqJobId!: string | null;

  /** Durable cancel marker set by cancelScheduledAgentJobRun; the processor aborts when set. */
  @Column({
    name: 'cancel_requested_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  cancelRequestedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt!: Date;

  /** Driver id snapshot at run time. */
  @Column({ name: 'driver_id', type: 'text' })
  driverId!: ScheduledAgentJobDriverId;

  /** Failure/timeout/cancel detail; null on success. */
  @Column({ name: 'error_message', nullable: true, type: 'text' })
  errorMessage!: string | null;

  /** Child process exit code from runAgentPrompt; null on timeout/cancel/spawn error. */
  @Column({ name: 'exit_code', nullable: true, type: 'integer' })
  exitCode!: number | null;

  @Column({
    name: 'finished_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  finishedAt!: Date | null;

  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Model snapshot at run time; null used the driver default. */
  @Column({ name: 'model', nullable: true, type: 'text' })
  model!: string | null;

  @Column({ name: 'scheduled_agent_job_id', type: 'uuid' })
  scheduledAgentJobId!: string;

  @Column({
    name: 'started_at',
    nullable: true,
    type: 'timestamp with time zone',
  })
  startedAt!: Date | null;

  @Column({ default: 'queued', name: 'status', type: 'text' })
  status!: ScheduledAgentJobRunStatus;

  @Column({ default: 'schedule', name: 'trigger', type: 'text' })
  trigger!: ScheduledAgentJobRunTrigger;
}
