/**
 * @description GraphQL resolver for BullMQ queues: queues (list), queue(input), job(jobId, queueName),
 * repeatableJobs(input), retryJob, duplicateJob, removeRepeatableJob. Job types (e.g. run-plan)
 * and future workflow extensibility are documented on JobObject.name and RepeatableJobObject.
 */

import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateQueueInput } from './create-queue.input';
import { CreateQueueResultObject } from './create-queue-result.object';
import { DuplicateJobInput } from './duplicate-job.input';
import { DuplicateJobResultObject } from './duplicate-job-result.object';
import { EnqueueDocIngestionInput } from './enqueue-doc-ingestion.input';
import { EnqueueDocIngestionResultObject } from './enqueue-doc-ingestion-result.object';
import { JobObject } from './job.object';
import { JobsResultObject, QueueDetailsObject } from './queue-details.object';
import { parseTaskRunMetricsFromReturnvalue } from './parse-task-run-metrics';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
import { QueueDetailsInput } from './queue-details.input';
import { QueuesService } from './queues.service';
import { QueueStatsObject } from './queue-stats.object';
import { RemoveRepeatableJobInput } from './remove-repeatable-job.input';
import { RemoveRepeatableJobResultObject } from './remove-repeatable-job-result.object';
import { RepeatableJobObject } from './repeatable-job.object';
import { RepeatableJobsInput } from './repeatable-jobs.input';
import { RetryJobInput } from './retry-job.input';
import { RetryJobResultObject } from './retry-job-result.object';

const DEFAULT_JOBS_OFFSET = 0;

@Resolver()
export class QueuesResolver {
  constructor(private readonly queuesService: QueuesService) {}

  @Query(() => QueueDetailsObject, {
    description: `Single queue by name with optional paginated jobs (limit/offset/states/asc).`,
    nullable: true,
  })
  async queue(
    @Args('input', { type: () => QueueDetailsInput })
    input: QueueDetailsInput,
  ): Promise<QueueDetailsObject | null> {
    const { name, limit, offset, asc, states } = input;
    const stats = await this.queuesService.getStatsForQueue(name);
    if (!stats) {
      return null;
    }

    const details = new QueueDetailsObject();

    details.activeCount = stats.activeCount;
    details.completedCount = stats.completedCount;
    details.delayedCount = stats.delayedCount;
    details.failedCount = stats.failedCount;
    details.name = stats.name;
    details.waitingCount = stats.waitingCount;

    const includeJobs = limit !== undefined && limit !== null && limit > 0;
    if (includeJobs) {
      const effectiveLimit = limit;
      const effectiveOffset = offset ?? DEFAULT_JOBS_OFFSET;
      const effectiveAsc = asc ?? false;
      const effectiveStates =
        states && states.length > 0
          ? states
          : ['waiting', 'active', 'completed', 'failed', 'delayed'];

      const result = await this.queuesService.getJobs(
        name,
        effectiveStates,
        effectiveOffset,
        effectiveLimit,
        effectiveAsc,
      );

      const jobsResult = new JobsResultObject();
      jobsResult.hasNext = result.hasNext;
      jobsResult.jobs = result.jobs.map((dto) => {
        const job = new JobObject();
        job.data = dto.data;
        job.executionBackend = dto.executionBackend;
        job.failedReason = dto.failedReason;
        job.finishedOn = dto.finishedOn;
        job.id = dto.id;
        job.name = dto.name;
        job.processedOn = dto.processedOn;
        job.progress = dto.progress;
        job.returnvalue = dto.returnvalue;
        job.state = dto.state;
        job.timestamp = dto.timestamp;
        job.taskRunMetrics =
          name === PLANS_QUEUE_NAME
            ? parseTaskRunMetricsFromReturnvalue(dto.returnvalue)
            : null;
        return job;
      });
      details.jobs = jobsResult;
    } else {
      details.jobs = null;
    }

    return details;
  }

  @Query(() => JobObject, {
    description: `Single job by id and queue name. Returns null if not found.`,
    nullable: true,
  })
  async job(
    @Args('jobId', { nullable: false, type: () => ID })
    jobId: string,
    @Args('queueName', { nullable: false, type: () => String })
    queueName: string,
  ): Promise<JobObject | null> {
    const dto = await this.queuesService.getJob(queueName, jobId);
    if (!dto) {
      return null;
    }

    const job = new JobObject();
    job.data = dto.data;
    job.executionBackend = dto.executionBackend;
    job.failedReason = dto.failedReason;
    job.finishedOn = dto.finishedOn;
    job.id = dto.id;
    job.name = dto.name;
    job.processedOn = dto.processedOn;
    job.progress = dto.progress;
    job.returnvalue = dto.returnvalue;
    job.state = dto.state;
    job.timestamp = dto.timestamp;
    job.taskRunMetrics =
      queueName === PLANS_QUEUE_NAME
        ? parseTaskRunMetricsFromReturnvalue(dto.returnvalue)
        : null;
    return job;
  }

  @Query(() => [RepeatableJobObject], {
    description:
      'List repeatable (scheduled) jobs for a queue. Use the returned key with removeRepeatableJob to remove one. Job types (e.g. run-plan) and future workflow extensibility are documented on JobObject and RepeatableJobObject.',
    nullable: false,
  })
  async repeatableJobs(
    @Args('input', { type: () => RepeatableJobsInput })
    input: RepeatableJobsInput,
  ): Promise<RepeatableJobObject[]> {
    const { queueName, start, end, asc } = input;
    const dtos = await this.queuesService.getRepeatableJobs(
      queueName,
      start,
      end,
      asc ?? false,
    );

    return dtos.map((dto) => {
      const obj = new RepeatableJobObject();
      obj.key = dto.key;
      obj.name = dto.name;
      obj.id = dto.id;
      obj.endDate = dto.endDate;
      obj.tz = dto.tz;
      obj.pattern = dto.pattern;
      obj.every = dto.every;
      obj.next = dto.next;
      return obj;
    });
  }

  @Query(() => [QueueStatsObject], {
    description: `List registered BullMQ queues with job counts (waiting, active, completed, failed, delayed).`,
  })
  async queues(): Promise<QueueStatsObject[]> {
    const stats = await this.queuesService.getStats();

    return stats.map((s) => {
      const obj = new QueueStatsObject();

      obj.activeCount = s.activeCount;
      obj.completedCount = s.completedCount;
      obj.delayedCount = s.delayedCount;
      obj.failedCount = s.failedCount;
      obj.name = s.name;
      obj.waitingCount = s.waitingCount;

      return obj;
    });
  }

  @Mutation(() => CreateQueueResultObject, {
    description: `Create a queue dynamically. The queue is registered so it appears in queues() and queue(name). Returns success with queueName or error.`,
  })
  async createQueue(
    @Args('input', { type: () => CreateQueueInput })
    input: CreateQueueInput,
  ): Promise<CreateQueueResultObject> {
    const result = await this.queuesService.createQueue(input.name);

    const out = new CreateQueueResultObject();
    if ('queueName' in result) {
      out.success = true;
      out.queueName = result.queueName;
      out.error = null;
    } else {
      out.success = false;
      out.queueName = null;
      out.error = result.error;
    }
    return out;
  }

  @Mutation(() => RetryJobResultObject, {
    description: `Retry a failed job. Validates queue exists and job is in failed state. Returns job id or error.`,
  })
  async retryJob(
    @Args('input', { type: () => RetryJobInput })
    input: RetryJobInput,
  ): Promise<RetryJobResultObject> {
    const result = await this.queuesService.retryJob(
      input.queueName,
      input.jobId,
    );

    const out = new RetryJobResultObject();
    if ('jobId' in result) {
      out.success = true;
      out.jobId = result.jobId;
      out.error = null;
    } else {
      out.success = false;
      out.jobId = null;
      out.error = result.error;
    }
    return out;
  }

  @Mutation(() => EnqueueDocIngestionResultObject, {
    description: `Enqueue a doc-ingestion job. Provide directories and/or files (at least one required). Job runs diff-based re-ingestion for the given paths. Returns job id or error.`,
  })
  async enqueueDocIngestion(
    @Args('input', { type: () => EnqueueDocIngestionInput })
    input: EnqueueDocIngestionInput,
  ): Promise<EnqueueDocIngestionResultObject> {
    const payload = {
      directories: input.directories ?? undefined,
      files: input.files ?? undefined,
      repo: input.repo ?? undefined,
      scope: input.scope ?? undefined,
      sha: input.sha ?? undefined,
    };
    const result = await this.queuesService.enqueueDocIngestion(payload);

    const out = new EnqueueDocIngestionResultObject();
    if ('jobId' in result) {
      out.success = true;
      out.jobId = result.jobId;
      out.error = null;
    } else {
      out.success = false;
      out.jobId = null;
      out.error = result.error;
    }
    return out;
  }

  @Mutation(() => DuplicateJobResultObject, {
    description: `Duplicate a job (add new job with same data). Works for plans queue and future queues. Returns new job id or error.`,
  })
  async duplicateJob(
    @Args('input', { type: () => DuplicateJobInput })
    input: DuplicateJobInput,
  ): Promise<DuplicateJobResultObject> {
    const result = await this.queuesService.duplicateJob(
      input.queueName,
      input.jobId,
    );

    const out = new DuplicateJobResultObject();
    if ('jobId' in result) {
      out.success = true;
      out.jobId = result.jobId;
      out.error = null;
    } else {
      out.success = false;
      out.jobId = null;
      out.error = result.error;
    }
    return out;
  }

  @Mutation(() => RemoveRepeatableJobResultObject, {
    description:
      'Remove a repeatable (scheduled) job by key. Key is returned by repeatableJobs(queueName).',
  })
  async removeRepeatableJob(
    @Args('input', { type: () => RemoveRepeatableJobInput })
    input: RemoveRepeatableJobInput,
  ): Promise<RemoveRepeatableJobResultObject> {
    const result = await this.queuesService.removeRepeatableByKey(
      input.queueName,
      input.key,
    );

    const out = new RemoveRepeatableJobResultObject();
    if ('removed' in result) {
      out.success = true;
      out.error = null;
    } else {
      out.success = false;
      out.error = result.error;
    }
    return out;
  }
}
