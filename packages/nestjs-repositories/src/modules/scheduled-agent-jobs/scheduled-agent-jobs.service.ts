/**
 * @description Repository/service for scheduled_agent_jobs + scheduled_agent_job_runs. Owns typed
 * persistence access; scheduling (BullMQ), validation, and the GraphQL surface live in the server.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import type {
  ScheduledAgentJobDriverId,
  ScheduledAgentJobSettings,
} from './scheduled-agent-job.entity';
import { ScheduledAgentJob } from './scheduled-agent-job.entity';
import type {
  ScheduledAgentJobRunStatus,
  ScheduledAgentJobRunTrigger,
} from './scheduled-agent-job-run.entity';
import { ScheduledAgentJobRun } from './scheduled-agent-job-run.entity';

/** Fields a caller supplies to create a schedule; `schedulerKey` is derived from the new id. */
export interface CreateScheduledAgentJobInput {
  readonly cronPattern: string;
  readonly cwd?: string | null;
  readonly driverId: ScheduledAgentJobDriverId;
  readonly enabled?: boolean;
  readonly model?: string | null;
  readonly name: string;
  readonly ownerUserId?: string | null;
  readonly prompt: string;
  readonly settings?: ScheduledAgentJobSettings;
  readonly timeoutMs?: number | null;
  readonly timezone?: string | null;
}

/** Mutable fields of a schedule; omitted fields are left unchanged. */
export type UpdateScheduledAgentJobInput = Partial<
  Omit<CreateScheduledAgentJobInput, 'ownerUserId'>
>;

/** Fields to open a run row (status defaults to queued). */
export interface CreateScheduledAgentJobRunInput {
  readonly bullmqJobId?: string | null;
  readonly driverId: ScheduledAgentJobDriverId;
  readonly model?: string | null;
  readonly scheduledAgentJobId: string;
  readonly status?: ScheduledAgentJobRunStatus;
  readonly trigger: ScheduledAgentJobRunTrigger;
}

/** Terminal state of a run: status + optional exit/error, stamped with finishedAt. */
export interface FinishScheduledAgentJobRunInput {
  readonly errorMessage?: string | null;
  readonly exitCode?: number | null;
  readonly status: ScheduledAgentJobRunStatus;
}

/** Stable BullMQ scheduler id for a schedule row. */
export const schedulerKeyForJob = (jobId: string): string =>
  `scheduled-job:${jobId}`;

@Injectable()
export class ScheduledAgentJobsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(ScheduledAgentJob)
    private readonly jobRepository: Repository<ScheduledAgentJob>,
    @InjectRepository(ScheduledAgentJobRun)
    private readonly runRepository: Repository<ScheduledAgentJobRun>,
  ) {
    this.logger.debug('🧩 scheduled-agent-jobs 🧩');
  }

  /** @description TypeORM repository for scheduled_agent_jobs (audit/advanced queries). */
  getJobRepository(): Repository<ScheduledAgentJob> {
    return this.jobRepository;
  }

  /** @description TypeORM repository for scheduled_agent_job_runs (audit/advanced queries). */
  getRunRepository(): Repository<ScheduledAgentJobRun> {
    return this.runRepository;
  }

  /** @description Create a schedule row, deriving the stable scheduler key from the generated id. */
  async createJob(
    input: CreateScheduledAgentJobInput,
  ): Promise<ScheduledAgentJob> {
    const draft = this.jobRepository.create({
      cronPattern: input.cronPattern,
      cwd: input.cwd ?? null,
      driverId: input.driverId,
      enabled: input.enabled ?? true,
      model: input.model ?? null,
      name: input.name,
      ownerUserId: input.ownerUserId ?? null,
      prompt: input.prompt,
      // Temporary placeholder; replaced with the id-derived key after insert.
      schedulerKey: 'pending',
      settings: input.settings ?? {},
      timeoutMs: input.timeoutMs ?? null,
      timezone: input.timezone ?? null,
    });

    const saved = await this.jobRepository.save(draft);
    saved.schedulerKey = schedulerKeyForJob(saved.id);
    return this.jobRepository.save(saved);
  }

  /** @description Find one schedule by id, or null. */
  async findJobById(id: string): Promise<ScheduledAgentJob | null> {
    return this.jobRepository.findOne({ where: { id } });
  }

  /** @description List schedules, newest first; optionally scoped to an owner. */
  async listJobs(ownerUserId?: string): Promise<ScheduledAgentJob[]> {
    return this.jobRepository.find({
      order: { createdAt: 'DESC' },
      ...(ownerUserId === undefined ? {} : { where: { ownerUserId } }),
    });
  }

  /** @description All enabled schedules — the reconciler's boot-time source of truth. */
  async listEnabledJobs(): Promise<ScheduledAgentJob[]> {
    return this.jobRepository.find({ where: { enabled: true } });
  }

  /** @description Apply a partial update and return the fresh row, or null when absent. */
  async updateJob(
    id: string,
    input: UpdateScheduledAgentJobInput,
  ): Promise<ScheduledAgentJob | null> {
    const existing = await this.findJobById(id);
    if (existing === null) return null;

    this.jobRepository.merge(existing, input);
    return this.jobRepository.save(existing);
  }

  /** @description Toggle enablement; returns the fresh row, or null when absent. */
  async setJobEnabled(
    id: string,
    enabled: boolean,
  ): Promise<ScheduledAgentJob | null> {
    return this.updateJob(id, { enabled });
  }

  /** @description Set the cached next-run time from the BullMQ scheduler. Best-effort. */
  async updateNextRunAt(id: string, nextRunAt: Date | null): Promise<void> {
    await this.jobRepository.update({ id }, { nextRunAt });
  }

  /** @description Delete a schedule (runs cascade via FK). Returns whether a row was removed. */
  async deleteJob(id: string): Promise<boolean> {
    const result = await this.jobRepository.delete({ id });
    return (result.affected ?? 0) > 0;
  }

  /** @description Open a run row. */
  async createRun(
    input: CreateScheduledAgentJobRunInput,
  ): Promise<ScheduledAgentJobRun> {
    const draft = this.runRepository.create({
      bullmqJobId: input.bullmqJobId ?? null,
      driverId: input.driverId,
      model: input.model ?? null,
      scheduledAgentJobId: input.scheduledAgentJobId,
      status: input.status ?? 'queued',
      trigger: input.trigger,
    });
    return this.runRepository.save(draft);
  }

  /** @description Find one run by id, or null. */
  async findRunById(id: string): Promise<ScheduledAgentJobRun | null> {
    return this.runRepository.findOne({ where: { id } });
  }

  /** @description Run history for a schedule, newest first. */
  async listRunsForJob(
    scheduledAgentJobId: string,
    limit = 50,
  ): Promise<ScheduledAgentJobRun[]> {
    return this.runRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
      where: { scheduledAgentJobId },
    });
  }

  /** @description Mark a run running: stamp startedAt + the BullMQ job id. */
  async markRunStarted(id: string, bullmqJobId: string): Promise<void> {
    await this.runRepository.update(
      { id },
      { bullmqJobId, startedAt: new Date(), status: 'running' },
    );
  }

  /** @description Mark a run terminal: status + finishedAt + optional exit/error. */
  async markRunFinished(
    id: string,
    input: FinishScheduledAgentJobRunInput,
  ): Promise<void> {
    await this.runRepository.update(
      { id },
      {
        errorMessage: input.errorMessage ?? null,
        exitCode: input.exitCode ?? null,
        finishedAt: new Date(),
        status: input.status,
      },
    );
  }

  /** @description Record a durable cancel request on a run. */
  async requestRunCancel(id: string): Promise<void> {
    await this.runRepository.update({ id }, { cancelRequestedAt: new Date() });
  }
}
