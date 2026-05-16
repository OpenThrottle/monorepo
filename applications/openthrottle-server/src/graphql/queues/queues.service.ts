/**
 * @description Aggregates BullMQ queue(s) and exposes job counts per queue via getJobCounts(). Supports dynamic queue creation via createQueue().
 */

import { InjectQueue } from '@nestjs/bullmq';
import type { Job, JobState, Queue } from 'bullmq';
import { Queue as BullQueue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DAILY_STATS_QUEUE_NAME } from '../../queues/daily-stats/daily-stats.constants';
import type { AggregateDailyStatsJobData } from '../../queues/daily-stats/daily-stats.types';
import { DOC_INGESTION_QUEUE_NAME } from '../../queues/doc-ingestion/doc-ingestion.constants';
import type {
  DocIngestionJobPayload,
  DocIngestionJobResult,
} from '../../queues/doc-ingestion/doc-ingestion.types';
import {
  PLANS_QUEUE_NAME,
  RUN_PLAN_ORCHESTRATOR_JOB_NAME,
  RUN_PLAN_SPAWN_JOB_NAME,
} from '../../queues/plans/plans.constants';
import type {
  RunPlanJobData,
  RunPlanOrchestratorJobData,
} from '../../queues/plans/plans.types';
import { DATABASE_BACKUP_QUEUE_NAME } from '../../queues/database-backup/database-backup.constants';
import type {
  DatabaseBackupJobPayload,
  DatabaseBackupJobResult,
} from '../../queues/database-backup/database-backup.types';

const DEFAULT_PLAN_RUN_EXECUTION_BACKEND = 'cursor';

/** @description Job data type for dynamically created queues (no fixed schema). */
type DynamicJobData = Record<string, unknown>;

/** @description Valid queue name: non-empty, alphanumeric, hyphen, underscore. Must not conflict with static queues. */
const QUEUE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MIN_QUEUE_NAME_LENGTH = 1;
const MAX_QUEUE_NAME_LENGTH = 128;

/** @description BullMQ `jobId` length and character set (portable dedupe keys). */
const MIN_IDEMPOTENCY_KEY_LENGTH = 1;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_.:-]+$/;

/** @description Union of all queue job data types for methods that work across static and dynamic queues. */
type AnyJobData =
  | AggregateDailyStatsJobData
  | DocIngestionJobPayload
  | DynamicJobData
  | RunPlanJobData;

export interface QueueStats {
  readonly activeCount: number;
  readonly completedCount: number;
  readonly delayedCount: number;
  readonly failedCount: number;
  readonly name: string;
  readonly waitingCount: number;
}

/** @description Shape of a job returned by getJobs for GraphQL mapping. */
export interface JobDto {
  readonly data: string | null;
  readonly executionBackend: string | null;
  readonly failedReason: string | null;
  readonly finishedOn: number | null;
  readonly id: string;
  readonly name: string | null;
  readonly processedOn: number | null;
  readonly progress: number | null;
  readonly returnvalue: string | null;
  readonly state: string;
  readonly timestamp: number | null;
}

interface PlanRunExecutionBackendJobData {
  readonly executionBackend?: unknown;
  readonly ralph?: {
    readonly backend?: unknown;
  };
}

export interface GetJobsResult {
  readonly hasNext: boolean;
  readonly jobs: JobDto[];
}

/** @description Payload for {@link QueuesService.enqueuePlanRalphOrchestrator}. */
export interface EnqueuePlanRalphOrchestratorQueuePayload {
  readonly idempotencyKey?: string;
  readonly jobData: RunPlanOrchestratorJobData;
  readonly priority?: number;
}

/** @description Shape of a repeatable job returned by getRepeatableJobs for GraphQL mapping. */
export interface RepeatableJobDto {
  readonly key: string;
  readonly name: string;
  readonly id: string | null;
  readonly endDate: number | null;
  readonly tz: string | null;
  readonly pattern: string | null;
  readonly every: string | null;
  readonly next: number | null;
}

const VALID_JOB_STATES = [
  'active',
  'completed',
  'delayed',
  'failed',
  'paused',
  'prioritized',
  'waiting',
  'waiting-children',
] as const;

//

const REGISTERED_QUEUES = [
  DATABASE_BACKUP_QUEUE_NAME,
  DAILY_STATS_QUEUE_NAME,
  DOC_INGESTION_QUEUE_NAME,
  PLANS_QUEUE_NAME,
] as const;

@Injectable()
export class QueuesService implements OnModuleDestroy {
  private readonly dynamicQueues = new Map<
    string,
    Queue<DynamicJobData, void>
  >();

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue(DAILY_STATS_QUEUE_NAME)
    private readonly dailyStatsQueue: Queue<AggregateDailyStatsJobData, void>,
    @InjectQueue(DATABASE_BACKUP_QUEUE_NAME)
    private readonly databaseBackupQueue: Queue<
      DatabaseBackupJobPayload,
      DatabaseBackupJobResult
    >,
    @InjectQueue(DOC_INGESTION_QUEUE_NAME)
    private readonly docIngestionQueue: Queue<
      DocIngestionJobPayload,
      DocIngestionJobResult
    >,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, void>,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      Array.from(this.dynamicQueues.values(), (q) => q.close()),
    );
    this.dynamicQueues.clear();
  }

  /**
   * @description Creates a queue dynamically and registers it so getStats/getQueueByName include it. Uses shared Redis connection. Returns { queueName } on success or { error } on failure. Idempotent: if the name is already registered, returns success with that name.
   */
  async createQueue(
    name: string,
  ): Promise<{ queueName: string } | { error: string }> {
    const trimmed = name.trim();
    if (trimmed.length < MIN_QUEUE_NAME_LENGTH) {
      return { error: 'Queue name is required' };
    }

    if (trimmed.length > MAX_QUEUE_NAME_LENGTH) {
      return {
        error: `Queue name must be at most ${MAX_QUEUE_NAME_LENGTH} characters`,
      };
    }

    if (
      REGISTERED_QUEUES.includes(trimmed as (typeof REGISTERED_QUEUES)[number])
    ) {
      return { error: `Queue name "${trimmed}" is reserved` };
    }

    if (!QUEUE_NAME_REGEX.test(trimmed)) {
      return {
        error: `Queue name must match ${QUEUE_NAME_REGEX.source}`,
      };
    }

    const existing = this.dynamicQueues.get(trimmed);
    if (existing) {
      return { queueName: trimmed };
    }

    const host =
      this.configService.get<string>('redis.host') ?? process.env.REDIS_HOST;
    const port =
      this.configService.get<number>('redis.port') ??
      Number(process.env.REDIS_PORT ?? 6379);

    if (!host) {
      return { error: 'Redis is not configured (REDIS_HOST)' };
    }

    try {
      const queue = new BullQueue<DynamicJobData, void>(trimmed, {
        connection: { host, port },
      });

      this.dynamicQueues.set(trimmed, queue);

      return { queueName: trimmed };
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      return { error: `Failed to create queue: ${message}` };
    }
  }

  /**
   * @description Returns the queue instance for the given name, or null if not registered.
   */
  getQueueByName(name: string): Queue<AnyJobData, void> | null {
    if (name === DAILY_STATS_QUEUE_NAME) {
      return this.dailyStatsQueue as Queue<AnyJobData, void>;
    }

    if (name === DATABASE_BACKUP_QUEUE_NAME) {
      return this.databaseBackupQueue as unknown as Queue<AnyJobData, void>;
    }

    if (name === DOC_INGESTION_QUEUE_NAME) {
      return this.docIngestionQueue as unknown as Queue<AnyJobData, void>;
    }

    if (name === DOC_INGESTION_QUEUE_NAME) {
      return this.docIngestionQueue as unknown as Queue<AnyJobData, void>;
    }

    if (name === PLANS_QUEUE_NAME) {
      return this.plansQueue as Queue<AnyJobData, void>;
    }

    const dynamic = this.dynamicQueues.get(name) ?? null;

    return dynamic as Queue<AnyJobData, void> | null;
  }

  /**
   * @description Returns job counts for the named queue, or null if the queue is not registered.
   */
  async getStatsForQueue(name: string): Promise<QueueStats | null> {
    const stats = await this.getStats();

    return stats.find((s) => s.name === name) ?? null;
  }

  /**
   * @description Returns a paginated list of jobs in the given queue and states. Uses BullMQ getJobs().
   * @param queueName - Registered queue name (e.g. plans).
   * @param states - Job states to include (e.g. waiting, active, completed, failed, delayed).
   * @param offset - Zero-based start index.
   * @param limit - Max number of jobs to return.
   * @param asc - If true, return in ascending order.
   */
  async getJobs(
    queueName: string,
    states: string[],
    offset: number,
    limit: number,
    asc: boolean,
  ): Promise<GetJobsResult> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      return { hasNext: false, jobs: [] };
    }

    const types = states.filter((s) =>
      (VALID_JOB_STATES as readonly string[]).includes(s),
    ) as JobState[];

    if (types.length === 0) {
      return { hasNext: false, jobs: [] };
    }

    const start = offset;
    const end = offset + limit;
    const raw = await queue.getJobs(types, start, end, asc);
    const hasNext = raw.length > limit;
    const slice = hasNext ? raw.slice(0, limit) : raw;

    const jobs = await Promise.all(slice.map((job) => this.mapJobToDto(job)));

    return { hasNext, jobs };
  }

  /**
   * @description Returns the last N completed jobs for a plan from the plans queue. Fetches completed jobs (newest first) and filters by job.data.planId. Used by metrics.recentPlanRunsMetrics.
   * @param planId - Plan UUID to filter by.
   * @param limit - Max number of jobs to return (capped at 500).
   */
  async getCompletedJobsByPlanId(
    planId: string,
    limit: number,
  ): Promise<JobDto[]> {
    const queue = this.getQueueByName(PLANS_QUEUE_NAME);
    if (!queue) {
      return [];
    }

    const cappedLimit = Math.min(Math.max(1, Math.floor(limit)), 500);
    const fetchSize = 500;
    const result = await this.getJobs(
      PLANS_QUEUE_NAME,
      ['completed'],
      0,
      fetchSize,
      false,
    );

    const matched: JobDto[] = [];
    for (const job of result.jobs) {
      if (matched.length >= cappedLimit) {
        break;
      }

      const data = this.parseJobDataPlanId(job.data);
      if (data !== null && data === planId) {
        matched.push(job);
      }
    }

    return matched;
  }

  /**
   * @description Returns a single job by id and queue name, or null if not found.
   */
  async getJob(queueName: string, jobId: string): Promise<JobDto | null> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return this.mapJobToDto(job);
  }

  /**
   * @description Extracts the selected execution backend from new plan-run job data, falling back for legacy jobs.
   */
  private getPlanRunExecutionBackend(
    data: unknown,
    queueName: string | null,
  ): string | null {
    if (
      queueName !== PLANS_QUEUE_NAME ||
      data == null ||
      typeof data !== 'object'
    ) {
      return null;
    }

    const jobData = data as PlanRunExecutionBackendJobData;

    if (typeof jobData.executionBackend === 'string') {
      return jobData.executionBackend;
    }

    if (typeof jobData.ralph?.backend === 'string') {
      return jobData.ralph.backend;
    }

    return DEFAULT_PLAN_RUN_EXECUTION_BACKEND;
  }

  /**
   * @description Retries a failed job. Queue must exist; job must be in failed state. Returns job id on success or error message.
   */
  async retryJob(
    queueName: string,
    jobId: string,
  ): Promise<{ jobId: string } | { error: string }> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      return { error: `Queue not found: ${queueName}` };
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    const state = await job.getState();
    if (state !== 'failed') {
      return { error: `Job is not in failed state (current: ${state})` };
    }

    await job.retry();
    const id = job.id ?? jobId;

    return { jobId: String(id) };
  }

  /**
   * @description Enqueues a doc-ingestion job with the given payload. At least one of directories or files must be non-empty. Returns new job id on success or error message.
   */
  async enqueueDocIngestion(
    payload: DocIngestionJobPayload,
  ): Promise<{ jobId: string } | { error: string }> {
    const directories = payload.directories ?? [];
    const files = payload.files ?? [];
    if (directories.length === 0 && files.length === 0) {
      return {
        error:
          'Doc-ingestion requires at least one of directories or files to be non-empty.',
      };
    }

    const job = await this.docIngestionQueue.add('doc-ingestion', payload);
    if (job.id == null) {
      return { error: 'Failed to get new job id' };
    }

    return { jobId: String(job.id) };
  }

  /**
   * @description Enqueues an in-process Ralph orchestrator job on the plans queue (`run-plan-orchestrator`).
   * Validates tuning via {@link RunPlanOrchestratorJobData}; optional `idempotencyKey` is passed as BullMQ `jobId` so duplicate adds return the existing job.
   */
  async enqueuePlanRalphOrchestrator(
    input: EnqueuePlanRalphOrchestratorQueuePayload,
  ): Promise<{ jobId: string } | { error: string }> {
    if (input.jobData.runKind !== 'orchestrator') {
      return { error: 'jobData.runKind must be orchestrator' };
    }

    let idempotencyKey: string | undefined;
    if (input.idempotencyKey !== undefined && input.idempotencyKey !== '') {
      const raw = input.idempotencyKey.trim();
      if (raw.length < MIN_IDEMPOTENCY_KEY_LENGTH) {
        return { error: 'idempotencyKey cannot be empty when provided' };
      }

      if (raw.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
        return {
          error: `idempotencyKey must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
        };
      }

      if (!IDEMPOTENCY_KEY_REGEX.test(raw)) {
        return {
          error: 'idempotencyKey must contain only letters, digits, and ._:-',
        };
      }

      idempotencyKey = raw;
    }

    const priority = input.priority;
    const opts =
      idempotencyKey !== undefined
        ? {
            ...(priority !== undefined ? { priority } : {}),
            jobId: idempotencyKey,
          }
        : priority !== undefined
          ? { priority }
          : {};

    try {
      const job = await this.plansQueue.add(
        RUN_PLAN_ORCHESTRATOR_JOB_NAME,
        input.jobData,
        opts,
      );
      if (job.id == null) {
        return { error: 'Failed to get new job id' };
      }
      return { jobId: String(job.id) };
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      return { error: `Failed to enqueue orchestrator job: ${message}` };
    }
  }

  /**
   * @description Duplicates a job by adding a new job with the same data (e.g. planId for plans queue). Returns new job id on success or error message.
   */
  async duplicateJob(
    queueName: string,
    jobId: string,
  ): Promise<{ jobId: string } | { error: string }> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      return { error: `Queue not found: ${queueName}` };
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }

    const jobName = job.name ?? RUN_PLAN_SPAWN_JOB_NAME;
    const jobData = job.data;
    const newJob = await queue.add(jobName, jobData);
    if (newJob.id == null) {
      return { error: 'Failed to get new job id' };
    }
    return { jobId: String(newJob.id) };
  }

  /**
   * @description Returns repeatable (scheduled) jobs for the named queue. Uses BullMQ getRepeatableJobs().
   * @param queueName - Registered queue name (e.g. plans).
   * @param start - Zero-based start index (optional).
   * @param end - Zero-based end index (optional).
   * @param asc - If true, order by next run ascending.
   */
  async getRepeatableJobs(
    queueName: string,
    start?: number,
    end?: number,
    asc?: boolean,
  ): Promise<RepeatableJobDto[]> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      return [];
    }

    const raw = await queue.getRepeatableJobs(start, end, asc ?? false);
    return raw.map((r) => ({
      endDate: r.endDate ?? null,
      every: r.every ?? null,
      id: r.id ?? null,
      key: r.key,
      name: r.name,
      next: r.next ?? null,
      pattern: r.pattern ?? null,
      tz: r.tz ?? null,
    }));
  }

  /**
   * @description Removes a repeatable job by key. Key comes from repeatableJobs(query). Returns removed true or error message.
   */
  async removeRepeatableByKey(
    queueName: string,
    key: string,
  ): Promise<{ removed: true } | { error: string }> {
    const queue = this.getQueueByName(queueName);

    if (!queue) {
      return { error: `Queue not found: ${queueName}` };
    }

    const stillExists = await queue.removeRepeatableByKey(key);
    if (stillExists) {
      return { error: 'Repeatable job not found or could not be removed' };
    }

    return { removed: true };
  }

  /**
   * @description Returns job counts per registered queue (static and dynamic). Uses BullMQ getJobCounts().
   */
  async getStats(): Promise<QueueStats[]> {
    const staticResults = await Promise.all(
      REGISTERED_QUEUES.map(async (queueName) => {
        const queue = this.getQueueByName(queueName);
        if (!queue) return null;

        const counts = await queue.getJobCounts();
        const stats: QueueStats = {
          activeCount: counts['active'] ?? 0,
          completedCount: counts['completed'] ?? 0,
          delayedCount: counts['delayed'] ?? 0,
          failedCount: counts['failed'] ?? 0,
          name: queueName,
          waitingCount: counts['waiting'] ?? 0,
        };
        return stats;
      }),
    );

    const dynamicNames = Array.from(this.dynamicQueues.keys());
    const dynamicResults = await Promise.all(
      dynamicNames.map(async (queueName) => {
        const queue = this.dynamicQueues.get(queueName);
        if (!queue) return null;
        const counts = await queue.getJobCounts();
        const stats: QueueStats = {
          activeCount: counts['active'] ?? 0,
          completedCount: counts['completed'] ?? 0,
          delayedCount: counts['delayed'] ?? 0,
          failedCount: counts['failed'] ?? 0,
          name: queueName,
          waitingCount: counts['waiting'] ?? 0,
        };
        return stats;
      }),
    );

    const all = [
      ...staticResults.filter((s): s is QueueStats => s != null),
      ...dynamicResults.filter((s): s is QueueStats => s != null),
    ];

    return all;
  }

  /**
   * @description Parses job.data JSON and returns planId if present (for plans-queue jobs); otherwise null.
   */
  private parseJobDataPlanId(data: string | null): string | null {
    if (data == null || data === '') {
      return null;
    }
    try {
      const parsed = JSON.parse(data) as unknown;
      if (parsed != null && typeof parsed === 'object' && 'planId' in parsed) {
        const planId = (parsed as { planId?: unknown }).planId;
        return typeof planId === 'string' ? planId : null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async mapJobToDto(job: Job<AnyJobData, void>): Promise<JobDto> {
    const state = await job.getState();
    const data =
      job.data !== undefined && job.data !== null
        ? JSON.stringify(job.data)
        : null;

    return {
      data,
      executionBackend: this.getPlanRunExecutionBackend(
        job.data,
        job.queueName ?? null,
      ),
      failedReason: job.failedReason ?? null,
      finishedOn: job.finishedOn ?? null,
      id: job.id ?? '',
      name: job.name ?? null,
      processedOn: job.processedOn ?? null,
      progress: typeof job.progress === 'number' ? job.progress : null,
      returnvalue:
        job.returnvalue !== undefined && job.returnvalue !== null
          ? JSON.stringify(job.returnvalue)
          : null,
      state,
      timestamp: job.timestamp ?? null,
    };
  }
}
