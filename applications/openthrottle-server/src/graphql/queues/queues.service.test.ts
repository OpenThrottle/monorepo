import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { Job, Queue } from 'bullmq';
import { createMock } from '@golevelup/ts-vitest';
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
} from '../../queues/plans/plans.constants';
import type {
  RunPlanJobData,
  RunPlanOrchestratorJobData,
} from '../../queues/plans/plans.types';
import { QueuesService } from './queues.service';

function createMockJob(overrides: Partial<Job<RunPlanJobData, void>> = {}) {
  return createMock<Job<RunPlanJobData, void>>({
    data: { planId: 'plan-1' },
    failedReason: null,
    finishedOn: undefined,
    getState: vi.fn().mockResolvedValue('completed'),
    id: 'job-1',
    name: 'run-plan',
    processedOn: 1234567890,
    progress: 100,
    returnvalue: undefined,
    timestamp: 1234567800,
    ...overrides,
  });
}

describe('QueuesService', () => {
  let service: QueuesService;

  const mockGetJobCounts = vi.fn().mockResolvedValue({
    active: 1,
    completed: 10,
    delayed: 0,
    failed: 2,
    waiting: 3,
  });

  const mockGetJobs = vi.fn().mockResolvedValue([]);

  const mockGetJob = vi.fn().mockResolvedValue(null);

  const mockRetry = vi.fn().mockResolvedValue(undefined);

  const mockAdd = vi
    .fn()
    .mockResolvedValue(
      createMock<Job<RunPlanJobData, void>>({ id: 'new-job-id' }),
    );

  const mockGetRepeatableJobs = vi.fn().mockResolvedValue([]);
  const mockRemoveRepeatableByKey = vi.fn().mockResolvedValue(true);

  const mockDailyStatsGetJobCounts = vi.fn().mockResolvedValue({
    active: 0,
    completed: 5,
    delayed: 1,
    failed: 0,
    waiting: 0,
  });

  const mockPlansQueue = createMock<Queue<RunPlanJobData, void>>({
    add: mockAdd,
    getJob: mockGetJob,
    getJobCounts: mockGetJobCounts,
    getJobs: mockGetJobs,
    getRepeatableJobs: mockGetRepeatableJobs,
    removeRepeatableByKey: mockRemoveRepeatableByKey,
  });

  const mockDailyStatsQueue = createMock<
    Queue<AggregateDailyStatsJobData, void>
  >({
    getJobCounts: mockDailyStatsGetJobCounts,
  });

  const mockDocIngestionAdd = vi.fn().mockResolvedValue(
    createMock<Job<DocIngestionJobPayload, DocIngestionJobResult>>({
      id: 'doc-ingestion-job-id',
    }),
  );
  const mockDocIngestionQueue = createMock<
    Queue<DocIngestionJobPayload, DocIngestionJobResult>
  >({
    add: mockDocIngestionAdd,
    getJobCounts: mockGetJobCounts,
    getJobs: mockGetJobs,
    getRepeatableJobs: mockGetRepeatableJobs,
    removeRepeatableByKey: mockRemoveRepeatableByKey,
  });

  const mockConfigService = createMock<ConfigService>({
    get: vi.fn((key: string) => {
      if (key === 'redis.host') return undefined;
      if (key === 'redis.port') return undefined;
      return undefined;
    }),
  });

  let savedRedisHost: string | undefined;

  beforeAll(async () => {
    savedRedisHost = process.env.REDIS_HOST;
    delete process.env.REDIS_HOST;

    const app = await Test.createTestingModule({
      providers: [
        QueuesService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getQueueToken(DAILY_STATS_QUEUE_NAME),
          useValue: mockDailyStatsQueue,
        },
        {
          provide: getQueueToken(DOC_INGESTION_QUEUE_NAME),
          useValue: mockDocIngestionQueue,
        },
        {
          provide: getQueueToken(PLANS_QUEUE_NAME),
          useValue: mockPlansQueue,
        },
      ],
    }).compile();

    service = app.get<QueuesService>(QueuesService);
  });

  afterAll(() => {
    if (savedRedisHost !== undefined) {
      process.env.REDIS_HOST = savedRedisHost;
    }
  });

  describe('createQueue', () => {
    test('returns error when queue name is empty after trim', async () => {
      const result = await service.createQueue('   ');
      expect(result).toEqual({ error: 'Queue name is required' });
    });

    test('returns error when queue name is too long', async () => {
      const result = await service.createQueue('a'.repeat(129));
      expect(result).toEqual({
        error: 'Queue name must be at most 128 characters',
      });
    });

    test('returns error when queue name has invalid characters', async () => {
      const result = await service.createQueue('my queue');
      expect(result).toMatchObject({
        error: expect.stringContaining('must match'),
      });
    });

    test('returns error when queue name is reserved (daily-stats)', async () => {
      const result = await service.createQueue(DAILY_STATS_QUEUE_NAME);
      expect(result).toEqual({
        error: `Queue name "${DAILY_STATS_QUEUE_NAME}" is reserved`,
      });
    });

    test('returns error when queue name is reserved (plans)', async () => {
      const result = await service.createQueue(PLANS_QUEUE_NAME);
      expect(result).toEqual({
        error: `Queue name "${PLANS_QUEUE_NAME}" is reserved`,
      });
    });

    test('returns error when Redis is not configured', async () => {
      const result = await service.createQueue('my-queue');
      expect(result).toEqual({
        error: 'Redis is not configured (REDIS_HOST)',
      });
    });
  });

  describe('getQueueByName', () => {
    test('returns queue when name is daily-stats', () => {
      expect(service.getQueueByName(DAILY_STATS_QUEUE_NAME)).toBe(
        mockDailyStatsQueue,
      );
    });

    test('returns queue when name is doc-ingestion', () => {
      expect(service.getQueueByName(DOC_INGESTION_QUEUE_NAME)).toBe(
        mockDocIngestionQueue,
      );
    });

    test('returns queue when name is plans', () => {
      expect(service.getQueueByName(PLANS_QUEUE_NAME)).toBe(mockPlansQueue);
    });

    test('returns null for unknown queue name', () => {
      expect(service.getQueueByName('other')).toBeNull();
    });
  });

  describe('getStatsForQueue', () => {
    test('returns stats for plans queue', async () => {
      const result = await service.getStatsForQueue(PLANS_QUEUE_NAME);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        activeCount: 1,
        completedCount: 10,
        name: PLANS_QUEUE_NAME,
      });
    });

    test('returns null for unknown queue name', async () => {
      const result = await service.getStatsForQueue('other');

      expect(result).toBeNull();
    });
  });

  describe('getJobs', () => {
    test('returns empty result when queue not found', async () => {
      const result = await service.getJobs(
        'other',
        ['completed'],
        0,
        10,
        false,
      );

      expect(result).toEqual({ hasNext: false, jobs: [] });
      expect(mockGetJobs).not.toHaveBeenCalled();
    });

    test('returns empty result when no valid states', async () => {
      const result = await service.getJobs(
        PLANS_QUEUE_NAME,
        ['invalid-state'],
        0,
        10,
        false,
      );

      expect(result).toEqual({ hasNext: false, jobs: [] });
      expect(mockGetJobs).not.toHaveBeenCalled();
    });

    test('calls queue.getJobs and maps jobs to DTOs', async () => {
      const mockJob = createMockJob({
        getState: vi.fn().mockResolvedValue('completed'),
        id: 'j1',
      });
      mockGetJobs.mockResolvedValueOnce([mockJob]);

      const result = await service.getJobs(
        PLANS_QUEUE_NAME,
        ['completed'],
        0,
        10,
        false,
      );

      expect(mockGetJobs).toHaveBeenCalledWith(['completed'], 0, 10, false);
      expect(result.hasNext).toBe(false);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0]).toMatchObject({
        id: 'j1',
        name: 'run-plan',
        state: 'completed',
      });
      expect(result.jobs[0].data).toBe(JSON.stringify({ planId: 'plan-1' }));
    });

    test('sets hasNext when more jobs than limit returned', async () => {
      const j1 = createMockJob({ id: 'j1' });
      const j2 = createMockJob({ id: 'j2' });
      mockGetJobs.mockResolvedValueOnce([j1, j2]);

      const result = await service.getJobs(
        PLANS_QUEUE_NAME,
        ['waiting'],
        0,
        1,
        true,
      );

      expect(result.hasNext).toBe(true);
      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].id).toBe('j1');
    });
  });

  describe('getJob', () => {
    test('returns null when queue not found', async () => {
      const result = await service.getJob('other', 'job-1');

      expect(result).toBeNull();
      expect(mockGetJob).not.toHaveBeenCalled();
    });

    test('returns null when job not found', async () => {
      mockGetJob.mockResolvedValueOnce(null);

      const result = await service.getJob(PLANS_QUEUE_NAME, 'nonexistent');

      expect(result).toBeNull();
      expect(mockGetJob).toHaveBeenCalledWith('nonexistent');
    });

    test('returns JobDto when job exists', async () => {
      const mockJob = createMockJob({
        getState: vi.fn().mockResolvedValue('completed'),
        id: 'job-99',
        name: 'run-plan',
      });
      mockGetJob.mockResolvedValueOnce(mockJob);

      const result = await service.getJob(PLANS_QUEUE_NAME, 'job-99');

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        id: 'job-99',
        name: 'run-plan',
        state: 'completed',
      });
      expect(result?.data).toBe(JSON.stringify({ planId: 'plan-1' }));
      expect(mockGetJob).toHaveBeenCalledWith('job-99');
    });
  });

  describe('getCompletedJobsByPlanId', () => {
    test('returns empty array when plans queue is not available', async () => {
      mockGetJobs.mockClear();

      const serviceWithNoPlans = await Test.createTestingModule({
        providers: [
          QueuesService,
          { provide: ConfigService, useValue: mockConfigService },
          {
            provide: getQueueToken(DAILY_STATS_QUEUE_NAME),
            useValue: mockDailyStatsQueue,
          },
          {
            provide: getQueueToken(DOC_INGESTION_QUEUE_NAME),
            useValue: mockDocIngestionQueue,
          },
          {
            provide: getQueueToken(PLANS_QUEUE_NAME),
            useValue: null,
          },
        ],
      }).compile();

      const s = serviceWithNoPlans.get<QueuesService>(QueuesService);
      const result = await s.getCompletedJobsByPlanId('plan-1', 10);

      expect(result).toEqual([]);
      expect(mockGetJobs).not.toHaveBeenCalled();
    });

    test('filters completed jobs by planId and caps limit', async () => {
      const jobPlanA1 = createMockJob({
        data: { planId: 'plan-a' },
        getState: vi.fn().mockResolvedValue('completed'),
        id: 'j1',
      });
      const jobPlanB = createMockJob({
        data: { planId: 'plan-b' },
        getState: vi.fn().mockResolvedValue('completed'),
        id: 'j2',
      });
      const jobPlanA2 = createMockJob({
        data: { planId: 'plan-a' },
        getState: vi.fn().mockResolvedValue('completed'),
        id: 'j3',
      });
      mockGetJobs.mockResolvedValueOnce([jobPlanA1, jobPlanB, jobPlanA2]);

      const result = await service.getCompletedJobsByPlanId('plan-a', 10);

      expect(mockGetJobs).toHaveBeenCalledWith(['completed'], 0, 500, false);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('j1');
      expect(result[1].id).toBe('j3');
      expect(result[0].data).toBe(JSON.stringify({ planId: 'plan-a' }));
    });

    test('caps limit at 500', async () => {
      mockGetJobs.mockResolvedValueOnce([]);

      await service.getCompletedJobsByPlanId('plan-1', 1000);

      expect(mockGetJobs).toHaveBeenCalledWith(['completed'], 0, 500, false);
    });
  });

  describe('getStats', () => {
    test('returns queue stats for all registered queues', async () => {
      mockGetJobCounts.mockClear();
      mockDailyStatsGetJobCounts.mockClear();

      const result = await service.getStats();

      expect(result).toHaveLength(3);
      const plansStats = result.find((s) => s.name === PLANS_QUEUE_NAME);
      const dailyStatsStats = result.find(
        (s) => s.name === DAILY_STATS_QUEUE_NAME,
      );
      const docIngestionStats = result.find(
        (s) => s.name === DOC_INGESTION_QUEUE_NAME,
      );
      expect(plansStats).toMatchObject({
        activeCount: 1,
        completedCount: 10,
        delayedCount: 0,
        failedCount: 2,
        name: PLANS_QUEUE_NAME,
        waitingCount: 3,
      });
      expect(dailyStatsStats).toMatchObject({
        activeCount: 0,
        completedCount: 5,
        delayedCount: 1,
        failedCount: 0,
        name: DAILY_STATS_QUEUE_NAME,
        waitingCount: 0,
      });
      expect(docIngestionStats).toMatchObject({
        activeCount: 1,
        completedCount: 10,
        delayedCount: 0,
        failedCount: 2,
        name: DOC_INGESTION_QUEUE_NAME,
        waitingCount: 3,
      });
      expect(mockGetJobCounts).toHaveBeenCalledTimes(2);
      expect(mockDailyStatsGetJobCounts).toHaveBeenCalledTimes(1);
    });

    test('uses 0 for missing count keys', async () => {
      mockGetJobCounts.mockResolvedValue({});
      mockDailyStatsGetJobCounts.mockResolvedValueOnce({});

      const result = await service.getStats();

      const plansStats = result.find((s) => s.name === PLANS_QUEUE_NAME);
      expect(plansStats).toMatchObject({
        activeCount: 0,
        completedCount: 0,
        delayedCount: 0,
        failedCount: 0,
        waitingCount: 0,
      });
    });
  });

  describe('retryJob', () => {
    test('returns error when queue not found', async () => {
      mockGetJob.mockClear();

      const result = await service.retryJob('other', 'job-1');

      expect(result).toEqual({ error: 'Queue not found: other' });
      expect(mockGetJob).not.toHaveBeenCalled();
    });

    test('returns error when job not found', async () => {
      mockGetJob.mockResolvedValueOnce(null);

      const result = await service.retryJob(PLANS_QUEUE_NAME, 'nonexistent');

      expect(result).toEqual({ error: 'Job not found' });
      expect(mockGetJob).toHaveBeenCalledWith('nonexistent');
    });

    test('returns error when job is not in failed state', async () => {
      const mockJob = createMockJob({
        getState: vi.fn().mockResolvedValue('completed'),
        id: 'job-1',
      });
      mockGetJob.mockResolvedValueOnce(mockJob);

      const result = await service.retryJob(PLANS_QUEUE_NAME, 'job-1');

      expect(result).toEqual({
        error: 'Job is not in failed state (current: completed)',
      });
      expect(mockRetry).not.toHaveBeenCalled();
    });

    test('returns jobId when retry succeeds', async () => {
      const mockJob = createMockJob({
        getState: vi.fn().mockResolvedValue('failed'),
        id: 'job-failed',
        retry: mockRetry,
      });
      mockGetJob.mockResolvedValueOnce(mockJob);

      const result = await service.retryJob(PLANS_QUEUE_NAME, 'job-failed');

      expect(result).toEqual({ jobId: 'job-failed' });
      expect(mockRetry).toHaveBeenCalledTimes(1);
      expect(mockGetJob).toHaveBeenCalledWith('job-failed');
    });
  });

  describe('enqueueDocIngestion', () => {
    test('returns error when both directories and files are empty', async () => {
      const result = await service.enqueueDocIngestion({});

      expect(result).toEqual({
        error:
          'Doc-ingestion requires at least one of directories or files to be non-empty.',
      });
      expect(mockDocIngestionAdd).not.toHaveBeenCalled();
    });

    test('returns jobId when payload has directories', async () => {
      mockDocIngestionAdd.mockClear();

      const result = await service.enqueueDocIngestion({
        directories: ['docs'],
        scope: 'default',
      });

      expect(result).toEqual({ jobId: 'doc-ingestion-job-id' });
      expect(mockDocIngestionAdd).toHaveBeenCalledWith('doc-ingestion', {
        directories: ['docs'],
        scope: 'default',
      });
    });

    test('returns jobId when payload has files', async () => {
      mockDocIngestionAdd.mockClear();

      const result = await service.enqueueDocIngestion({
        files: ['README.md'],
      });

      expect(result).toEqual({ jobId: 'doc-ingestion-job-id' });
      expect(mockDocIngestionAdd).toHaveBeenCalledWith('doc-ingestion', {
        files: ['README.md'],
      });
    });

    test('returns error when add returns job without id', async () => {
      mockDocIngestionAdd.mockResolvedValueOnce(
        createMock<Job<DocIngestionJobPayload, DocIngestionJobResult>>({
          id: undefined,
        }),
      );

      const result = await service.enqueueDocIngestion({
        directories: ['docs'],
      });

      expect(result).toEqual({ error: 'Failed to get new job id' });
    });
  });

  describe('enqueuePlanRalphOrchestrator', () => {
    const orchJobData: RunPlanOrchestratorJobData = {
      planId: '80864bba-630a-451d-bfd2-4b25ec202381',
      runKind: 'orchestrator',
    };

    test('returns error when runKind is not orchestrator', async () => {
      mockAdd.mockClear();
      const bad = await service.enqueuePlanRalphOrchestrator({
        jobData: {
          planId: '80864bba-630a-451d-bfd2-4b25ec202381',
          runKind: 'spawn',
        } as unknown as RunPlanOrchestratorJobData,
      });
      expect(bad).toEqual({ error: 'jobData.runKind must be orchestrator' });
      expect(mockAdd).not.toHaveBeenCalled();
    });

    test('enqueues with job name run-plan-orchestrator and priority', async () => {
      mockAdd.mockClear();

      const result = await service.enqueuePlanRalphOrchestrator({
        jobData: orchJobData,
        priority: 5,
      });

      expect(result).toEqual({ jobId: 'new-job-id' });
      expect(mockAdd).toHaveBeenCalledWith(
        RUN_PLAN_ORCHESTRATOR_JOB_NAME,
        orchJobData,
        { priority: 5 },
      );
    });

    test('passes idempotencyKey as BullMQ jobId', async () => {
      mockAdd.mockClear();

      const result = await service.enqueuePlanRalphOrchestrator({
        idempotencyKey: 'ralph-orch:80864bba',
        jobData: orchJobData,
        priority: 10,
      });

      expect(result).toEqual({ jobId: 'new-job-id' });
      expect(mockAdd).toHaveBeenCalledWith(
        RUN_PLAN_ORCHESTRATOR_JOB_NAME,
        orchJobData,
        { jobId: 'ralph-orch:80864bba', priority: 10 },
      );
    });

    test('returns error when idempotencyKey has invalid characters', async () => {
      mockAdd.mockClear();

      const result = await service.enqueuePlanRalphOrchestrator({
        idempotencyKey: 'has spaces',
        jobData: orchJobData,
      });

      expect(result).toEqual({
        error: 'idempotencyKey must contain only letters, digits, and ._:-',
      });
      expect(mockAdd).not.toHaveBeenCalled();
    });

    test('returns error when add throws', async () => {
      mockAdd.mockRejectedValueOnce(new Error('redis down'));

      const result = await service.enqueuePlanRalphOrchestrator({
        jobData: orchJobData,
      });

      expect(result).toEqual({
        error: 'Failed to enqueue orchestrator job: redis down',
      });
    });
  });

  describe('duplicateJob', () => {
    test('returns error when queue not found', async () => {
      mockGetJob.mockClear();
      mockAdd.mockClear();

      const result = await service.duplicateJob('other', 'job-1');

      expect(result).toEqual({ error: 'Queue not found: other' });
      expect(mockGetJob).not.toHaveBeenCalled();
    });

    test('returns error when job not found', async () => {
      mockAdd.mockClear();
      mockGetJob.mockResolvedValueOnce(null);

      const result = await service.duplicateJob(
        PLANS_QUEUE_NAME,
        'nonexistent',
      );

      expect(result).toEqual({ error: 'Job not found' });
      expect(mockGetJob).toHaveBeenCalledWith('nonexistent');
      expect(mockAdd).not.toHaveBeenCalled();
    });

    test('returns new jobId when duplicate succeeds', async () => {
      const mockJob = createMockJob({
        data: { planId: 'plan-99' },
        id: 'job-1',
        name: 'run-plan',
      });
      mockGetJob.mockResolvedValueOnce(mockJob);
      mockAdd.mockResolvedValueOnce(
        createMock<Job<RunPlanJobData, void>>({ id: 'duplicated-job-id' }),
      );

      const result = await service.duplicateJob(PLANS_QUEUE_NAME, 'job-1');

      expect(result).toEqual({ jobId: 'duplicated-job-id' });
      expect(mockGetJob).toHaveBeenCalledWith('job-1');
      expect(mockAdd).toHaveBeenCalledWith('run-plan', { planId: 'plan-99' });
    });

    test('returns error when add returns job without id', async () => {
      const mockJob = createMockJob({ id: 'job-1' });
      mockGetJob.mockResolvedValueOnce(mockJob);
      mockAdd.mockResolvedValueOnce(
        createMock<Job<RunPlanJobData, void>>({ id: undefined }),
      );

      const result = await service.duplicateJob(PLANS_QUEUE_NAME, 'job-1');

      expect(result).toEqual({ error: 'Failed to get new job id' });
      expect(mockAdd).toHaveBeenCalledWith('run-plan', { planId: 'plan-1' });
    });
  });

  describe('getRepeatableJobs', () => {
    test('returns empty array when queue not found', async () => {
      const result = await service.getRepeatableJobs('other');

      expect(result).toEqual([]);
      expect(mockGetRepeatableJobs).not.toHaveBeenCalled();
    });

    test('returns mapped repeatable jobs from queue', async () => {
      mockGetRepeatableJobs.mockResolvedValueOnce([
        {
          endDate: 1739617200000,
          every: null,
          id: 'job-1',
          key: 'repeat:plans::key-1',
          name: 'run-plan',
          next: 1739012400000,
          pattern: '0 9 * * 1-5',
          tz: 'Europe/London',
        },
      ]);

      const result = await service.getRepeatableJobs(
        PLANS_QUEUE_NAME,
        0,
        10,
        true,
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        endDate: 1739617200000,
        every: null,
        id: 'job-1',
        key: 'repeat:plans::key-1',
        name: 'run-plan',
        next: 1739012400000,
        pattern: '0 9 * * 1-5',
        tz: 'Europe/London',
      });
      expect(mockGetRepeatableJobs).toHaveBeenCalledWith(0, 10, true);
    });
  });

  describe('removeRepeatableByKey', () => {
    test('returns error when queue not found', async () => {
      const result = await service.removeRepeatableByKey('other', 'key-1');

      expect(result).toEqual({ error: 'Queue not found: other' });
      expect(mockRemoveRepeatableByKey).not.toHaveBeenCalled();
    });

    test('returns removed when BullMQ removeRepeatableByKey returns false', async () => {
      mockRemoveRepeatableByKey.mockResolvedValueOnce(false);

      const result = await service.removeRepeatableByKey(
        PLANS_QUEUE_NAME,
        'repeat:plans::key-1',
      );

      expect(result).toEqual({ removed: true });
      expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith(
        'repeat:plans::key-1',
      );
    });

    test('returns error when BullMQ removeRepeatableByKey returns true', async () => {
      mockRemoveRepeatableByKey.mockResolvedValueOnce(true);

      const result = await service.removeRepeatableByKey(
        PLANS_QUEUE_NAME,
        'bad-key',
      );

      expect(result).toEqual({
        error: 'Repeatable job not found or could not be removed',
      });
      expect(mockRemoveRepeatableByKey).toHaveBeenCalledWith('bad-key');
    });
  });
});
