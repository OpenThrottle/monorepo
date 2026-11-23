/**
 * @description Aggregates BullMQ queue(s) and exposes job counts per queue via getJobCounts(). Supports dynamic queue creation via createQueue().
 */
import { getQueueToken } from '@nestjs/bullmq';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  resolveQueuePrefix,
  resolveRedisConnection,
} from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { resolvePagination } from '@openthrottle/nestjs-postgres';
import { isRecord } from '@openthrottle/nodejs-utils';
import type { Job, JobState, Queue } from 'bullmq';
import { Queue as BullQueue } from 'bullmq';

import {
  AGENTIC_TEST_JOB_NAME,
  AGENTIC_TEST_QUEUE_NAME,
} from '../../../queues/agentic-test/agentic-test.constants.ts';
import type { AgenticTestJobPayload } from '../../../queues/agentic-test/agentic-test.types.ts';
import type { AggregateDailyStatsJobData } from '../../../queues/daily-stats/daily-stats.types.ts';
import type { DatabaseBackupJobPayload } from '../../../queues/database-backup/database-backup.types.ts';
import { RUN_PLAN_ORCHESTRATOR_JOB_NAME } from '../../../queues/plans/plans.constants.ts';
import { PLANS_QUEUE_NAME } from '../../../queues/plans/plans.constants.ts';
import type {
  RunPlanJobData,
  RunPlanOrchestratorJobData,
} from '../../../queues/plans/plans.types.ts';
import { SERVER_QUEUE_NAMES } from '../../../queues/queues.constants.ts';
import { normalizeIdempotencyKey } from './queues-service.utils.ts';

const DEFAULT_PLAN_RUN_DRIVER = 'cursor';

/** @description Job data type for dynamically created queues (no fixed schema). */
type DynamicJobData = Record<string, unknown>;

/** @description Valid queue name: non-empty, alphanumeric, hyphen, underscore. Must not conflict with static queues. */
const QUEUE_NAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const MIN_QUEUE_NAME_LENGTH = 1;
const MAX_QUEUE_NAME_LENGTH = 128;

/**
 * @description How long createQueue waits for a new dynamic queue's Redis client
 * to connect and authenticate. ioredis retries an unreachable host forever, so
 * without a bound a bad connection would hang the mutation instead of failing it.
 */
const DYNAMIC_QUEUE_READY_TIMEOUT_MS = 5000;
/** @description Union of all queue job data types for methods that work across static and dynamic queues. */
type AnyJobData =
  | AgenticTestJobPayload
  | AggregateDailyStatsJobData
  | DatabaseBackupJobPayload
  | DynamicJobData
  | RunPlanJobData;

interface QueueStats {
  readonly activeCount: number;
  readonly completedCount: number;
  readonly delayedCount: number;
  readonly failedCount: number;
  readonly name: string;
  readonly waitingCount: number;
}

/** @description Shape of a job returned by getJobs for GraphQL mapping. */
interface JobDto {
  readonly data: string | null;
  readonly driver: string | null;
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

interface GetJobsResult {
  readonly hasNext: boolean;
  readonly jobs: JobDto[];
  /** Total jobs across the requested states (state-filtered), for accurate pagination. */
  readonly total: number;
}

/** @description Payload for {@link QueuesService.enqueuePlanRun}. */
interface EnqueuePlanRunQueuePayload {
  /** Delay in ms before the job becomes runnable (BullMQ `delay`); omit for an immediate job. */
  readonly delayMs?: number;
  readonly idempotencyKey?: string;
  readonly jobData: RunPlanOrchestratorJobData;
  readonly priority?: number;
}

/** @description Shape of a repeatable job returned by getRepeatableJobs for GraphQL mapping. */
interface RepeatableJobDto {
  readonly endDate: number | null;
  readonly every: string | null;
  readonly id: string | null;
  readonly key: string;
  readonly name: string;
  readonly next: number | null;
  readonly pattern: string | null;
  readonly tz: string | null;
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

@Injectable()
export class QueuesService implements OnModuleDestroy, OnModuleInit {
  private readonly dynamicQueues = new Map<string, Queue<AnyJobData, void>>();

  /** @description Registry queues resolved from DI, built once by {@link QueuesService.resolveRegisteredQueues}. */
  private registeredQueues: ReadonlyMap<
    string,
    Queue<AnyJobData, void>
  > | null = null;

  constructor(
    private readonly logger: LoggerService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onModuleInit(): void {
    this.resolveRegisteredQueues();
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      Array.from(this.dynamicQueues.values(), (q) => q.close()),
    );
    this.dynamicQueues.clear();
  }

  /**
   * @description Creates a queue dynamically and registers it so getStats/getQueueByName include it. Connects with the same Redis options (auth, TLS, db) and key prefix as the DI-registered queues, and is only registered once its client has connected and authenticated. Returns { queueName } on success or { error } on failure. Idempotent: if the name is already registered, returns success with that name.
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

    if (SERVER_QUEUE_NAMES.some((queueName) => queueName === trimmed)) {
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

    const connection = resolveRedisConnection();
    if (!connection) {
      return { error: 'Redis is not configured (REDIS_HOST)' };
    }

    try {
      const queue = new BullQueue<AnyJobData, void>(trimmed, {
        connection,
        // Same environment-scoped prefix as the DI-registered queues so
        // dynamic queues stay inside this checkout's keyspace.
        prefix: resolveQueuePrefix(),
      });

      // A Redis error after creation (dropped connection, failover) must be
      // logged, not thrown as an unhandled 'error' event.
      queue.on('error', (error) => {
        this.logger.warn(
          `Dynamic queue "${trimmed}" Redis error: ${error.message}`,
        );
      });

      const readyError = await this.waitForQueueReady(queue);
      if (readyError !== null) {
        // Never registered, so nothing else would ever close this connection.
        await queue.close();

        return { error: `Failed to create queue: ${readyError}` };
      }

      // A concurrent createQueue for the same name may have registered while
      // this one waited; keep that queue and drop the duplicate connection.
      if (this.dynamicQueues.has(trimmed)) {
        await queue.close();

        return { queueName: trimmed };
      }

      this.dynamicQueues.set(trimmed, queue);

      return { queueName: trimmed };
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      return { error: `Failed to create queue: ${message}` };
    }
  }

  /**
   * @description Waits up to {@link DYNAMIC_QUEUE_READY_TIMEOUT_MS} for the queue's Redis client to connect and authenticate. Returns null when ready, otherwise the reason it is not.
   */
  private async waitForQueueReady(
    queue: Queue<AnyJobData, void>,
  ): Promise<string | null> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<string>((resolve) => {
      timer = setTimeout(() => {
        resolve(
          `Redis did not become ready within ${DYNAMIC_QUEUE_READY_TIMEOUT_MS}ms`,
        );
      }, DYNAMIC_QUEUE_READY_TIMEOUT_MS);
    });

    // Settles with the failure reason instead of rejecting, so a client that
    // fails after the timeout already won cannot surface as an unhandled rejection.
    const ready = (async (): Promise<string | null> => {
      try {
        await queue.waitUntilReady();

        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    })();

    try {
      return await Promise.race([ready, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * @description Returns the queue instance for the given name, or null if not registered.
   */
  getQueueByName(name: string): Queue<AnyJobData, void> | null {
    return (
      this.resolveRegisteredQueues().get(name) ??
      this.dynamicQueues.get(name) ??
      null
    );
  }

  /**
   * @description Resolves every {@link SERVER_QUEUE_NAMES} queue from DI once and caches the map.
   * A name whose queue cannot be resolved (its producer module is not imported by
   * QueuesServiceModule) is logged as an error and left out, never dropped silently.
   */
  private resolveRegisteredQueues(): ReadonlyMap<
    string,
    Queue<AnyJobData, void>
  > {
    if (this.registeredQueues !== null) {
      return this.registeredQueues;
    }

    const resolved = new Map<string, Queue<AnyJobData, void>>();
    for (const name of SERVER_QUEUE_NAMES) {
      try {
        resolved.set(
          name,
          this.moduleRef.get<Queue<AnyJobData, void>>(getQueueToken(name), {
            strict: false,
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Queue "${name}" is in SERVER_QUEUE_NAMES but could not be resolved; import its producer module in QueuesServiceModule: ${message}`,
        );
      }
    }
    this.registeredQueues = resolved;

    return resolved;
  }

  /**
   * @description Returns job counts for the named queue, or null if the queue is not registered. Reads only that queue, so another queue's Redis failure cannot affect it; this queue's own failure rejects with the Redis error.
   */
  async getStatsForQueue(name: string): Promise<QueueStats | null> {
    const queue = this.getQueueByName(name);
    if (!queue) {
      return null;
    }

    return this.readQueueStats(name, queue);
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
      return { hasNext: false, jobs: [], total: 0 };
    }

    const types = states.filter((s): s is JobState =>
      VALID_JOB_STATES.some((valid) => valid === s),
    );

    if (types.length === 0) {
      return { hasNext: false, jobs: [], total: 0 };
    }

    const start = offset;
    const end = offset + limit;
    const raw = await queue.getJobs(types, start, end, asc);
    const hasNext = raw.length > limit;
    const slice = hasNext ? raw.slice(0, limit) : raw;

    const jobs = await Promise.all(slice.map((job) => this.mapJobToDto(job)));

    const totalRaw = await queue.getJobCountByTypes(...types);
    const total = typeof totalRaw === 'number' ? totalRaw : 0;

    return { hasNext, jobs, total };
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

    const cappedLimit = resolvePagination({ limit }, { max: 500 }).take;
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
   * @description Extracts the selected driver from new plan-run job data, falling back for legacy jobs.
   */
  private getPlanRunDriver(
    data: unknown,
    queueName: string | null,
  ): string | null {
    if (queueName !== PLANS_QUEUE_NAME || !isRecord(data)) {
      return null;
    }

    if (typeof data.driver === 'string') {
      return data.driver;
    }

    const tuning = data.tuning;
    if (isRecord(tuning) && typeof tuning.driver === 'string') {
      return tuning.driver;
    }

    return DEFAULT_PLAN_RUN_DRIVER;
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
   * @description Pauses a queue so workers stop picking up new jobs (in-flight jobs finish). Reversible via resumeQueue. Returns queueName on success or error message.
   */
  async pauseQueue(
    queueName: string,
  ): Promise<{ queueName: string } | { error: string }> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      return { error: `Queue not found: ${queueName}` };
    }

    try {
      await queue.pause();
      return { queueName };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to pause queue: ${message}` };
    }
  }

  /**
   * @description Resumes a paused queue so workers pick up jobs again. Returns queueName on success or error message.
   */
  async resumeQueue(
    queueName: string,
  ): Promise<{ queueName: string } | { error: string }> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      return { error: `Queue not found: ${queueName}` };
    }

    try {
      await queue.resume();
      return { queueName };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to resume queue: ${message}` };
    }
  }

  /**
   * @description Removes finished jobs from a queue. Guarded: only `completed` or `failed` jobs may be cleaned.
   * @param queueName - Registered queue name.
   * @param state - Which finished jobs to remove ('completed' or 'failed').
   * @param graceMs - Only remove jobs finished at least this many ms ago (0 = any age).
   * @param limit - Max jobs to remove (0 = no limit).
   */
  async cleanQueue(
    queueName: string,
    state: string,
    graceMs: number,
    limit: number,
  ): Promise<{ removedCount: number } | { error: string }> {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      return { error: `Queue not found: ${queueName}` };
    }

    if (state !== 'completed' && state !== 'failed') {
      return {
        error: 'Only completed or failed jobs can be cleaned',
      };
    }

    const safeGrace =
      Number.isFinite(graceMs) && graceMs > 0 ? Math.floor(graceMs) : 0;
    const safeLimit =
      Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;

    try {
      const removed = await queue.clean(safeGrace, safeLimit, state);
      return { removedCount: Array.isArray(removed) ? removed.length : 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { error: `Failed to clean queue: ${message}` };
    }
  }

  /**
   * @description Enqueues an agentic-test smoke job (echo timestamps for ~30s). Returns new job id on success.
   */
  async enqueueAgenticTest(): Promise<{ jobId: string } | { error: string }> {
    const queue = this.getQueueByName(AGENTIC_TEST_QUEUE_NAME);
    if (!queue) {
      return { error: `Queue not found: ${AGENTIC_TEST_QUEUE_NAME}` };
    }

    const job = await queue.add(AGENTIC_TEST_JOB_NAME, {});
    if (job.id == null) {
      return { error: 'Failed to get new job id' };
    }

    return { jobId: String(job.id) };
  }

  /**
   * @description Enqueues an in-process plan-run orchestrator job on the plans queue (`run-plan-orchestrator`).
   * Validates tuning via {@link RunPlanOrchestratorJobData}; optional `idempotencyKey` is passed as BullMQ `jobId` so duplicate adds return the existing job; optional `delayMs` adds the job in the delayed state (used by usage-limit resume).
   */
  async enqueuePlanRun(
    input: EnqueuePlanRunQueuePayload,
  ): Promise<{ jobId: string } | { error: string }> {
    if (input.jobData.runKind !== 'orchestrator') {
      return { error: 'jobData.runKind must be orchestrator' };
    }

    const normalizedKey = normalizeIdempotencyKey(input.idempotencyKey);
    if ('error' in normalizedKey) {
      return { error: normalizedKey.error };
    }
    const idempotencyKey = normalizedKey.key;

    const { delayMs, priority } = input;
    const opts = {
      ...(delayMs !== undefined && delayMs > 0 ? { delay: delayMs } : {}),
      ...(idempotencyKey !== undefined ? { jobId: idempotencyKey } : {}),
      ...(priority !== undefined ? { priority } : {}),
    };

    const queue = this.getQueueByName(PLANS_QUEUE_NAME);
    if (!queue) {
      return { error: `Queue not found: ${PLANS_QUEUE_NAME}` };
    }

    try {
      const job = await queue.add(
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

    const jobName = job.name ?? RUN_PLAN_ORCHESTRATOR_JOB_NAME;
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
   * @description Returns job counts per registered queue (static and dynamic). Uses BullMQ getJobCounts(). A queue whose counts cannot be read is logged and left out, so one broken connection cannot fail the whole listing.
   */
  async getStats(): Promise<QueueStats[]> {
    const staticQueues = Array.from(
      this.resolveRegisteredQueues(),
      ([name, queue]) => ({ name, queue }),
    );
    const dynamicQueues = Array.from(this.dynamicQueues, ([name, queue]) => ({
      name,
      queue,
    }));
    const queues = [...staticQueues, ...dynamicQueues];

    const results = await Promise.allSettled(
      queues.map(({ name, queue }) => this.readQueueStats(name, queue)),
    );

    return results.flatMap((result, index) => {
      if (result.status === 'fulfilled') {
        return [result.value];
      }

      const name = queues[index]?.name ?? 'unknown';
      const err: unknown = result.reason;
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Queue "${name}" stats unavailable: ${reason}`);

      return [];
    });
  }

  /**
   * @description Reads one queue's job counts into {@link QueueStats}, defaulting missing states to 0.
   */
  private async readQueueStats(
    name: string,
    queue: Queue<AnyJobData, void>,
  ): Promise<QueueStats> {
    const counts = await queue.getJobCounts();

    return {
      activeCount: counts['active'] ?? 0,
      completedCount: counts['completed'] ?? 0,
      delayedCount: counts['delayed'] ?? 0,
      failedCount: counts['failed'] ?? 0,
      name,
      waitingCount: counts['waiting'] ?? 0,
    };
  }

  /**
   * @description Parses job.data JSON and returns planId if present (for plans-queue jobs); otherwise null.
   */
  private parseJobDataPlanId(data: string | null): string | null {
    if (data == null || data === '') {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(data);
      if (isRecord(parsed) && typeof parsed.planId === 'string') {
        return parsed.planId;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async mapJobToDto(job: Job<AnyJobData, void>): Promise<JobDto> {
    const state = await job.getState();
    const data = job.data != null ? JSON.stringify(job.data) : null;
    const hasReturnvalue = job.returnvalue != null;
    const returnvalue = hasReturnvalue ? JSON.stringify(job.returnvalue) : null;

    return {
      data,
      driver: this.getPlanRunDriver(job.data, job.queueName ?? null),
      failedReason: job.failedReason ?? null,
      finishedOn: job.finishedOn ?? null,
      id: job.id ?? '',
      name: job.name ?? null,
      processedOn: job.processedOn ?? null,
      progress: typeof job.progress === 'number' ? job.progress : null,
      returnvalue,
      state,
      timestamp: job.timestamp ?? null,
    };
  }
}
