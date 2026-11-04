/**
 * @description Aggregates BullMQ queue(s) and exposes job counts per queue via getJobCounts(). Supports dynamic queue creation via createQueue().
 */

import { posix } from 'node:path';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  resolveQueuePrefix,
  resolveRedisConnection,
} from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { isRecord } from '@openthrottle/nodejs-utils';
import type { Job, JobState, Queue } from 'bullmq';
import { Queue as BullQueue } from 'bullmq';

import {
  AGENTIC_TEST_JOB_NAME,
  AGENTIC_TEST_QUEUE_NAME,
} from '../../queues/agentic-test/agentic-test.constants.ts';
import type { AgenticTestJobPayload } from '../../queues/agentic-test/agentic-test.types.ts';
import { CODE_INDEX_QUEUE_NAME } from '../../queues/code-index/code-index.constants.ts';
import { DAILY_STATS_QUEUE_NAME } from '../../queues/daily-stats/daily-stats.constants.ts';
import type { AggregateDailyStatsJobData } from '../../queues/daily-stats/daily-stats.types.ts';
import { DATABASE_BACKUP_QUEUE_NAME } from '../../queues/database-backup/database-backup.constants.ts';
import type { DatabaseBackupJobPayload } from '../../queues/database-backup/database-backup.types.ts';
import { DOC_INGESTION_QUEUE_NAME } from '../../queues/doc-ingestion/doc-ingestion.constants.ts';
import type { DocIngestionJobPayload } from '../../queues/doc-ingestion/doc-ingestion.types.ts';
import { PLAN_LIFECYCLE_HOOKS_QUEUE_NAME } from '../../queues/plan-lifecycle-hooks/plan-lifecycle-hooks.constants.ts';
import { PLAN_RULES_QUEUE_NAME } from '../../queues/plan-rules/plan-rules.constants.ts';
import {
  PLANS_QUEUE_NAME,
  RUN_PLAN_ORCHESTRATOR_JOB_NAME,
  RUN_PLAN_SPAWN_JOB_NAME,
} from '../../queues/plans/plans.constants.ts';
import type {
  RunPlanJobData,
  RunPlanOrchestratorJobData,
} from '../../queues/plans/plans.types.ts';
import { TAGGING_QUEUE_NAME } from '../../queues/tagging/tagging.constants.ts';
import { TASK_PROMOTION_QUEUE_NAME } from '../../queues/task-promotion/task-promotion.constants.ts';
import { WORK_LEDGER_SWEEP_QUEUE_NAME } from '../../queues/work-ledger-sweep/work-ledger-sweep.constants.ts';
import { WORK_LEDGER_VERIFY_QUEUE_NAME } from '../../queues/work-ledger-verify/work-ledger-verify.constants.ts';

const DEFAULT_PLAN_RUN_EXECUTION_BACKEND = 'cursor';

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

/** @description BullMQ `jobId` length and character set (portable dedupe keys). */
const MIN_IDEMPOTENCY_KEY_LENGTH = 1;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_.:-]+$/;

/**
 * @description Validate and normalize an optional idempotency key (used as a BullMQ `jobId`).
 * Returns `{ key: undefined }` when no key was supplied, the trimmed key when valid, or `{ error }`.
 * Exported so callers can validate BEFORE committing related DB writes (atomic enqueue path).
 */
export function normalizeIdempotencyKey(
  raw: string | null | undefined,
): { readonly key: string | undefined } | { readonly error: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { key: undefined };
  }

  const trimmed = raw.trim();

  if (trimmed.length < MIN_IDEMPOTENCY_KEY_LENGTH) {
    return { error: 'idempotencyKey cannot be empty when provided' };
  }

  if (trimmed.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return {
      error: `idempotencyKey must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
    };
  }

  if (!IDEMPOTENCY_KEY_REGEX.test(trimmed)) {
    return {
      error: 'idempotencyKey must contain only letters, digits, and ._:-',
    };
  }

  return { key: trimmed };
}

/**
 * @description Validate doc-ingestion directory/file paths before enqueue. The
 * downstream `openthrottle:import-docs` script resolves each path against
 * `WORKSPACE_ROOT`, so a path that is absolute or traverses upward (`../`) could
 * escape the workspace. Reject those at the API boundary (defense-in-depth — the
 * spawn args themselves are fixed, so this is not command injection). Returns the
 * trimmed, POSIX-normalized paths on success or `{ error }` on the first bad path.
 */
export function normalizeWorkspaceRelativePaths(
  raw: readonly string[],
  label: string,
): { readonly paths: readonly string[] } | { readonly error: string } {
  const normalized: string[] = [];

  for (const entry of raw) {
    const trimmed = entry.trim();
    if (trimmed === '') {
      return { error: `${label} must not contain empty paths` };
    }

    if (posix.isAbsolute(trimmed) || /^[A-Za-z]:[\\/]/.test(trimmed)) {
      return {
        error: `${label} must be relative to the workspace root: "${entry}"`,
      };
    }

    // Collapse `.`/`..` segments; a leading `..` means the path escapes the root.
    const collapsed = posix.normalize(trimmed.replace(/\\/g, '/'));
    if (collapsed === '..' || collapsed.startsWith('../')) {
      return {
        error: `${label} must not escape the workspace root: "${entry}"`,
      };
    }

    normalized.push(collapsed);
  }

  return { paths: normalized };
}

/** @description Union of all queue job data types for methods that work across static and dynamic queues. */
type AnyJobData =
  | AgenticTestJobPayload
  | AggregateDailyStatsJobData
  | DatabaseBackupJobPayload
  | DocIngestionJobPayload
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

interface GetJobsResult {
  readonly hasNext: boolean;
  readonly jobs: JobDto[];
  /** Total jobs across the requested states (state-filtered), for accurate pagination. */
  readonly total: number;
}

/** @description Payload for {@link QueuesService.enqueuePlanRalphOrchestrator}. */
interface EnqueuePlanRalphOrchestratorQueuePayload {
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

//

const REGISTERED_QUEUES = [
  AGENTIC_TEST_QUEUE_NAME,
  CODE_INDEX_QUEUE_NAME,
  DAILY_STATS_QUEUE_NAME,
  DATABASE_BACKUP_QUEUE_NAME,
  DOC_INGESTION_QUEUE_NAME,
  PLAN_LIFECYCLE_HOOKS_QUEUE_NAME,
  PLAN_RULES_QUEUE_NAME,
  PLANS_QUEUE_NAME,
  TAGGING_QUEUE_NAME,
  TASK_PROMOTION_QUEUE_NAME,
  WORK_LEDGER_SWEEP_QUEUE_NAME,
  WORK_LEDGER_VERIFY_QUEUE_NAME,
] as const;

@Injectable()
export class QueuesService implements OnModuleDestroy {
  private readonly dynamicQueues = new Map<string, Queue<AnyJobData, void>>();

  constructor(
    private readonly logger: LoggerService,
    @InjectQueue(AGENTIC_TEST_QUEUE_NAME)
    private readonly agenticTestQueue: Queue<AnyJobData, void>,
    @InjectQueue(CODE_INDEX_QUEUE_NAME)
    private readonly codeIndexQueue: Queue<AnyJobData, void>,
    @InjectQueue(DAILY_STATS_QUEUE_NAME)
    private readonly dailyStatsQueue: Queue<AnyJobData, void>,
    @InjectQueue(DATABASE_BACKUP_QUEUE_NAME)
    private readonly databaseBackupQueue: Queue<AnyJobData, void>,
    @InjectQueue(DOC_INGESTION_QUEUE_NAME)
    private readonly docIngestionQueue: Queue<AnyJobData, void>,
    @InjectQueue(PLAN_LIFECYCLE_HOOKS_QUEUE_NAME)
    private readonly planLifecycleHooksQueue: Queue<AnyJobData, void>,
    @InjectQueue(PLAN_RULES_QUEUE_NAME)
    private readonly planRulesQueue: Queue<AnyJobData, void>,
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<AnyJobData, void>,
    @InjectQueue(TAGGING_QUEUE_NAME)
    private readonly taggingQueue: Queue<AnyJobData, void>,
    @InjectQueue(WORK_LEDGER_SWEEP_QUEUE_NAME)
    private readonly workLedgerSweepQueue: Queue<AnyJobData, void>,
    @InjectQueue(WORK_LEDGER_VERIFY_QUEUE_NAME)
    private readonly workLedgerVerifyQueue: Queue<AnyJobData, void>,
  ) {}

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

    if (REGISTERED_QUEUES.some((queueName) => queueName === trimmed)) {
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
    if (name === AGENTIC_TEST_QUEUE_NAME) {
      return this.agenticTestQueue;
    }

    if (name === CODE_INDEX_QUEUE_NAME) {
      return this.codeIndexQueue;
    }

    if (name === DAILY_STATS_QUEUE_NAME) {
      return this.dailyStatsQueue;
    }

    if (name === DATABASE_BACKUP_QUEUE_NAME) {
      return this.databaseBackupQueue;
    }

    if (name === DOC_INGESTION_QUEUE_NAME) {
      return this.docIngestionQueue;
    }

    if (name === PLAN_LIFECYCLE_HOOKS_QUEUE_NAME) {
      return this.planLifecycleHooksQueue;
    }

    if (name === PLAN_RULES_QUEUE_NAME) {
      return this.planRulesQueue;
    }

    if (name === PLANS_QUEUE_NAME) {
      return this.plansQueue;
    }

    if (name === TAGGING_QUEUE_NAME) {
      return this.taggingQueue;
    }

    if (name === WORK_LEDGER_SWEEP_QUEUE_NAME) {
      return this.workLedgerSweepQueue;
    }

    if (name === WORK_LEDGER_VERIFY_QUEUE_NAME) {
      return this.workLedgerVerifyQueue;
    }

    return this.dynamicQueues.get(name) ?? null;
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
    if (queueName !== PLANS_QUEUE_NAME || !isRecord(data)) {
      return null;
    }

    if (typeof data.executionBackend === 'string') {
      return data.executionBackend;
    }

    const ralph = data.ralph;
    if (isRecord(ralph) && typeof ralph.backend === 'string') {
      return ralph.backend;
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
   * @description Enqueues a doc-ingestion job with the given payload. At least one of directories or files must be non-empty. Returns new job id on success or error message.
   */
  /**
   * @description Enqueues an agentic-test smoke job (echo timestamps for ~30s). Returns new job id on success.
   */
  async enqueueAgenticTest(): Promise<{ jobId: string } | { error: string }> {
    const job = await this.agenticTestQueue.add(AGENTIC_TEST_JOB_NAME, {});
    if (job.id == null) {
      return { error: 'Failed to get new job id' };
    }

    return { jobId: String(job.id) };
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

    const normalizedDirectories = normalizeWorkspaceRelativePaths(
      directories,
      'directories',
    );
    if ('error' in normalizedDirectories) {
      return { error: normalizedDirectories.error };
    }

    const normalizedFiles = normalizeWorkspaceRelativePaths(files, 'files');
    if ('error' in normalizedFiles) {
      return { error: normalizedFiles.error };
    }

    const safePayload: DocIngestionJobPayload = {
      ...payload,
      ...(directories.length > 0
        ? { directories: normalizedDirectories.paths }
        : {}),
      ...(files.length > 0 ? { files: normalizedFiles.paths } : {}),
    };

    const job = await this.docIngestionQueue.add('doc-ingestion', safePayload);
    if (job.id == null) {
      return { error: 'Failed to get new job id' };
    }

    return { jobId: String(job.id) };
  }

  /**
   * @description Enqueues an in-process Ralph orchestrator job on the plans queue (`run-plan-orchestrator`).
   * Validates tuning via {@link RunPlanOrchestratorJobData}; optional `idempotencyKey` is passed as BullMQ `jobId` so duplicate adds return the existing job; optional `delayMs` adds the job in the delayed state (used by usage-limit resume).
   */
  async enqueuePlanRalphOrchestrator(
    input: EnqueuePlanRalphOrchestratorQueuePayload,
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
   * @description Returns job counts per registered queue (static and dynamic). Uses BullMQ getJobCounts(). A queue whose counts cannot be read is logged and left out, so one broken connection cannot fail the whole listing.
   */
  async getStats(): Promise<QueueStats[]> {
    const staticQueues = REGISTERED_QUEUES.flatMap((name) => {
      const queue = this.getQueueByName(name);

      return queue ? [{ name, queue }] : [];
    });
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
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
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
