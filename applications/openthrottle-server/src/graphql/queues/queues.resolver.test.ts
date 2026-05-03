import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
import { QueuesResolver } from './queues.resolver';
import { QueuesService } from './queues.service';

describe('QueuesResolver', () => {
  let resolver: QueuesResolver;

  const mockStats = [
    {
      activeCount: 0,
      completedCount: 5,
      delayedCount: 0,
      failedCount: 1,
      name: PLANS_QUEUE_NAME,
      waitingCount: 2,
    },
  ];

  const mockQueuesService = createMock<QueuesService>({
    createQueue: vi.fn().mockResolvedValue({ error: 'not implemented' }),
    duplicateJob: vi.fn().mockResolvedValue({ error: 'not implemented' }),
    enqueueDocIngestion: vi
      .fn()
      .mockResolvedValue({ error: 'not implemented' }),
    getJob: vi.fn().mockResolvedValue(null),
    getJobs: vi.fn().mockResolvedValue({ hasNext: false, jobs: [] }),
    getRepeatableJobs: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue(mockStats),
    getStatsForQueue: vi.fn().mockResolvedValue(mockStats[0]),
    removeRepeatableByKey: vi
      .fn()
      .mockResolvedValue({ error: 'not implemented' }),
    retryJob: vi.fn().mockResolvedValue({ error: 'not implemented' }),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        QueuesResolver,
        { provide: QueuesService, useValue: mockQueuesService },
      ],
    }).compile();

    resolver = app.get<QueuesResolver>(QueuesResolver);
  });

  describe('queue', () => {
    test('returns null when getStatsForQueue returns null', async () => {
      vi.mocked(mockQueuesService.getStatsForQueue).mockResolvedValueOnce(null);

      const result = await resolver.queue({ name: 'unknown' });

      expect(result).toBeNull();
      expect(mockQueuesService.getJobs).not.toHaveBeenCalled();
    });

    test('returns QueueDetailsObject with stats and no jobs when limit not provided', async () => {
      const result = await resolver.queue({ name: PLANS_QUEUE_NAME });

      expect(result).not.toBeNull();
      expect(result?.name).toBe(PLANS_QUEUE_NAME);
      expect(result?.activeCount).toBe(0);
      expect(result?.completedCount).toBe(5);
      expect(result?.jobs).toBeNull();
      expect(mockQueuesService.getJobs).not.toHaveBeenCalled();
    });

    test('returns QueueDetailsObject with jobs when limit provided', async () => {
      vi.mocked(mockQueuesService.getJobs).mockResolvedValueOnce({
        hasNext: true,
        jobs: [
          {
            data: '{"planId":"p1"}',
            failedReason: null,
            finishedOn: null,
            id: 'job-1',
            name: 'run-plan',
            processedOn: null,
            progress: null,
            returnvalue: null,
            state: 'waiting',
            timestamp: 1000,
          },
        ],
      });

      const result = await resolver.queue({
        asc: false,
        limit: 10,
        name: PLANS_QUEUE_NAME,
        offset: 0,
        states: ['waiting', 'active'],
      });

      expect(result).not.toBeNull();
      expect(result?.jobs).not.toBeNull();
      expect(result?.jobs?.jobs).toHaveLength(1);
      expect(result?.jobs?.jobs[0].id).toBe('job-1');
      expect(result?.jobs?.jobs[0].state).toBe('waiting');
      expect(result?.jobs?.hasNext).toBe(true);
      expect(result?.jobs?.jobs[0].taskRunMetrics).toBeNull();
      expect(mockQueuesService.getJobs).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        ['waiting', 'active'],
        0,
        10,
        false,
      );
    });

    test('maps plans queue jobs with returnvalue taskRunMetrics to job.taskRunMetrics', async () => {
      const returnvalue = JSON.stringify({
        taskRunMetrics: {
          atEnd: {
            cpuSystemMs: 10,
            cpuUserMs: 100,
            externalMb: 1,
            heapTotalMb: 32,
            heapUsedMb: 22,
            rssMb: 55,
          },
          atStart: {
            cpuSystemMs: 0,
            cpuUserMs: 0,
            externalMb: 1,
            heapTotalMb: 30,
            heapUsedMb: 20,
            rssMb: 50,
          },
        },
      });
      vi.mocked(mockQueuesService.getJobs).mockResolvedValueOnce({
        hasNext: false,
        jobs: [
          {
            data: '{"planId":"p1"}',
            failedReason: null,
            finishedOn: 1234567890,
            id: 'job-2',
            name: 'run-plan',
            processedOn: 1234567800,
            progress: 100,
            returnvalue,
            state: 'completed',
            timestamp: 1234567700,
          },
        ],
      });

      const result = await resolver.queue({
        asc: false,
        limit: 10,
        name: PLANS_QUEUE_NAME,
        offset: 0,
        states: ['completed'],
      });

      expect(result?.jobs?.jobs).toHaveLength(1);
      expect(result?.jobs?.jobs[0].taskRunMetrics).not.toBeNull();
      expect(result?.jobs?.jobs[0].taskRunMetrics?.atStart.rssMb).toBe(50);
      expect(result?.jobs?.jobs[0].taskRunMetrics?.atEnd.rssMb).toBe(55);
    });
  });

  describe('job', () => {
    test('returns null when getJob returns null', async () => {
      vi.mocked(mockQueuesService.getJob).mockResolvedValueOnce(null);

      const result = await resolver.job('job-1', PLANS_QUEUE_NAME);

      expect(result).toBeNull();
      expect(mockQueuesService.getJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
      );
    });

    test('returns JobObject when job exists', async () => {
      vi.mocked(mockQueuesService.getJob).mockResolvedValueOnce({
        data: '{"planId":"p1"}',
        failedReason: null,
        finishedOn: 1234567890,
        id: 'job-1',
        name: 'run-plan',
        processedOn: 1234567800,
        progress: 100,
        returnvalue: null,
        state: 'completed',
        timestamp: 1234567700,
      });

      const result = await resolver.job('job-1', PLANS_QUEUE_NAME);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('job-1');
      expect(result?.name).toBe('run-plan');
      expect(result?.state).toBe('completed');
      expect(result?.data).toBe('{"planId":"p1"}');
      expect(result?.taskRunMetrics).toBeNull();
      expect(mockQueuesService.getJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
      );
    });

    test('returns JobObject with taskRunMetrics when plans queue job has returnvalue with taskRunMetrics', async () => {
      const returnvalue = JSON.stringify({
        taskRunMetrics: {
          atEnd: {
            cpuSystemMs: 20,
            cpuUserMs: 200,
            externalMb: 1.5,
            heapTotalMb: 32,
            heapUsedMb: 22,
            rssMb: 55,
          },
          atStart: {
            cpuSystemMs: 10,
            cpuUserMs: 100,
            externalMb: 1,
            heapTotalMb: 30,
            heapUsedMb: 20,
            rssMb: 50,
          },
        },
      });
      vi.mocked(mockQueuesService.getJob).mockResolvedValueOnce({
        data: '{"planId":"p1"}',
        failedReason: null,
        finishedOn: 1234567890,
        id: 'job-1',
        name: 'run-plan',
        processedOn: 1234567800,
        progress: 100,
        returnvalue,
        state: 'completed',
        timestamp: 1234567700,
      });

      const result = await resolver.job('job-1', PLANS_QUEUE_NAME);

      expect(result).not.toBeNull();
      expect(result?.taskRunMetrics).not.toBeNull();
      expect(result?.taskRunMetrics?.atStart.rssMb).toBe(50);
      expect(result?.taskRunMetrics?.atEnd.rssMb).toBe(55);
      expect(result?.taskRunMetrics?.atEnd.cpuUserMs).toBe(200);
    });

    test('returns JobObject with null taskRunMetrics when queue is not plans', async () => {
      const returnvalue = JSON.stringify({
        taskRunMetrics: {
          atEnd: {
            cpuSystemMs: 0,
            cpuUserMs: 0,
            externalMb: 1,
            heapTotalMb: 32,
            heapUsedMb: 22,
            rssMb: 55,
          },
          atStart: {
            cpuSystemMs: 0,
            cpuUserMs: 0,
            externalMb: 1,
            heapTotalMb: 30,
            heapUsedMb: 20,
            rssMb: 50,
          },
        },
      });
      vi.mocked(mockQueuesService.getJob).mockResolvedValueOnce({
        data: '{}',
        failedReason: null,
        finishedOn: 1234567890,
        id: 'job-1',
        name: 'other',
        processedOn: 1234567800,
        progress: 100,
        returnvalue,
        state: 'completed',
        timestamp: 1234567700,
      });

      const result = await resolver.job('job-1', 'daily-stats');

      expect(result).not.toBeNull();
      expect(result?.taskRunMetrics).toBeNull();
    });

    test('returns JobObject with childProcessMetrics and wallClockMetrics when present in returnvalue', async () => {
      const returnvalue = JSON.stringify({
        taskRunMetrics: {
          atEnd: {
            cpuSystemMs: 20,
            cpuUserMs: 200,
            externalMb: 1.5,
            heapTotalMb: 32,
            heapUsedMb: 22,
            rssMb: 55,
          },
          atStart: {
            cpuSystemMs: 10,
            cpuUserMs: 100,
            externalMb: 1,
            heapTotalMb: 30,
            heapUsedMb: 20,
            rssMb: 50,
          },
          childProcessMetrics: {
            avgCpuPercent: 42.5,
            avgRssMb: 256,
            peakCpuPercent: 85.2,
            peakRssMb: 512,
            pid: 12345,
            pollIntervalMs: 5000,
            sampleCount: 15,
          },
          wallClockMetrics: {
            cpuSystemMs: 500,
            cpuTimeMs: 2500,
            cpuUserMs: 2000,
            endTimestamp: 1700000010000,
            interpretation: 'mixed',
            startTimestamp: 1700000000000,
            wallClockMs: 10000,
            wallClockToCpuRatio: 4.0,
          },
        },
      });
      vi.mocked(mockQueuesService.getJob).mockResolvedValueOnce({
        data: '{"planId":"p1"}',
        failedReason: null,
        finishedOn: 1234567890,
        id: 'job-1',
        name: 'run-plan',
        processedOn: 1234567800,
        progress: 100,
        returnvalue,
        state: 'completed',
        timestamp: 1234567700,
      });

      const result = await resolver.job('job-1', PLANS_QUEUE_NAME);

      expect(result).not.toBeNull();
      expect(result?.taskRunMetrics).not.toBeNull();
      expect(result?.taskRunMetrics?.childProcessMetrics).not.toBeNull();
      expect(result?.taskRunMetrics?.childProcessMetrics?.pid).toBe(12345);
      expect(result?.taskRunMetrics?.childProcessMetrics?.peakCpuPercent).toBe(
        85.2,
      );
      expect(result?.taskRunMetrics?.childProcessMetrics?.avgCpuPercent).toBe(
        42.5,
      );
      expect(result?.taskRunMetrics?.wallClockMetrics).not.toBeNull();
      expect(result?.taskRunMetrics?.wallClockMetrics?.wallClockMs).toBe(10000);
      expect(result?.taskRunMetrics?.wallClockMetrics?.interpretation).toBe(
        'mixed',
      );
      expect(
        result?.taskRunMetrics?.wallClockMetrics?.wallClockToCpuRatio,
      ).toBe(4.0);
    });
  });

  describe('repeatableJobs', () => {
    test('returns array of RepeatableJobObject from QueuesService.getRepeatableJobs', async () => {
      vi.mocked(mockQueuesService.getRepeatableJobs).mockResolvedValueOnce([
        {
          endDate: null,
          every: null,
          id: 'job-id',
          key: 'repeat:plans::job-id',
          name: 'run-plan',
          next: 1739012400000,
          pattern: '0 9 * * 1-5',
          tz: null,
        },
      ]);

      const result = await resolver.repeatableJobs({
        asc: true,
        queueName: PLANS_QUEUE_NAME,
      });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('repeat:plans::job-id');
      expect(result[0].name).toBe('run-plan');
      expect(result[0].pattern).toBe('0 9 * * 1-5');
      expect(result[0].next).toBe(1739012400000);
      expect(mockQueuesService.getRepeatableJobs).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        undefined,
        undefined,
        true,
      );
    });

    test('returns empty array when service returns no repeatable jobs', async () => {
      vi.mocked(mockQueuesService.getRepeatableJobs).mockResolvedValueOnce([]);

      const result = await resolver.repeatableJobs({
        asc: false,
        end: 10,
        queueName: PLANS_QUEUE_NAME,
        start: 0,
      });

      expect(result).toHaveLength(0);
      expect(mockQueuesService.getRepeatableJobs).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        0,
        10,
        false,
      );
    });
  });

  describe('queues', () => {
    test('returns array of QueueStatsObject from QueuesService.getStats', async () => {
      const result = await resolver.queues();

      expect(mockQueuesService.getStats).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        activeCount: 0,
        completedCount: 5,
        delayedCount: 0,
        failedCount: 1,
        name: PLANS_QUEUE_NAME,
        waitingCount: 2,
      });
    });

    test('returns empty array when service returns no queues', async () => {
      vi.mocked(mockQueuesService.getStats).mockResolvedValueOnce([]);

      const result = await resolver.queues();

      expect(result).toHaveLength(0);
    });
  });

  describe('enqueueDocIngestion', () => {
    test('returns success and jobId when service returns jobId', async () => {
      vi.mocked(mockQueuesService.enqueueDocIngestion).mockResolvedValueOnce({
        jobId: 'doc-job-123',
      });

      const result = await resolver.enqueueDocIngestion({
        directories: ['docs'],
        files: null,
        repo: null,
        scope: 'default',
        sha: null,
      });

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('doc-job-123');
      expect(result.error).toBeNull();
      expect(mockQueuesService.enqueueDocIngestion).toHaveBeenCalledWith({
        directories: ['docs'],
        files: undefined,
        repo: undefined,
        scope: 'default',
        sha: undefined,
      });
    });

    test('returns success false and error when service returns error', async () => {
      vi.mocked(mockQueuesService.enqueueDocIngestion).mockResolvedValueOnce({
        error: 'At least one of directories or files required.',
      });

      const result = await resolver.enqueueDocIngestion({
        directories: null,
        files: null,
        repo: null,
        scope: null,
        sha: null,
      });

      expect(result.success).toBe(false);
      expect(result.jobId).toBeNull();
      expect(result.error).toBe(
        'At least one of directories or files required.',
      );
    });
  });

  describe('createQueue', () => {
    test('returns CreateQueueResultObject with success and queueName when service returns queueName', async () => {
      vi.mocked(mockQueuesService.createQueue).mockResolvedValueOnce({
        queueName: 'my-queue',
      });

      const input = { name: 'my-queue' };
      const result = await resolver.createQueue(input);

      expect(result.success).toBe(true);
      expect(result.queueName).toBe('my-queue');
      expect(result.error).toBeNull();
      expect(mockQueuesService.createQueue).toHaveBeenCalledWith('my-queue');
    });

    test('returns CreateQueueResultObject with success false and error when service returns error', async () => {
      vi.mocked(mockQueuesService.createQueue).mockResolvedValueOnce({
        error: 'Queue name "x" is reserved',
      });

      const input = { name: 'x' };
      const result = await resolver.createQueue(input);

      expect(result.success).toBe(false);
      expect(result.queueName).toBeNull();
      expect(result.error).toBe('Queue name "x" is reserved');
      expect(mockQueuesService.createQueue).toHaveBeenCalledWith('x');
    });
  });

  describe('retryJob', () => {
    test('returns RetryJobResultObject with success and jobId when service returns jobId', async () => {
      vi.mocked(mockQueuesService.retryJob).mockResolvedValueOnce({
        jobId: 'job-123',
      });

      const input = { jobId: 'job-123', queueName: PLANS_QUEUE_NAME };
      const result = await resolver.retryJob(input);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('job-123');
      expect(result.error).toBeNull();
      expect(mockQueuesService.retryJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-123',
      );
    });

    test('returns RetryJobResultObject with success false and error when service returns error', async () => {
      vi.mocked(mockQueuesService.retryJob).mockResolvedValueOnce({
        error: 'Job is not in failed state (current: completed)',
      });

      const input = { jobId: 'job-1', queueName: PLANS_QUEUE_NAME };
      const result = await resolver.retryJob(input);

      expect(result.success).toBe(false);
      expect(result.jobId).toBeNull();
      expect(result.error).toBe(
        'Job is not in failed state (current: completed)',
      );
      expect(mockQueuesService.retryJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
      );
    });
  });

  describe('duplicateJob', () => {
    test('returns DuplicateJobResultObject with success and jobId when service returns jobId', async () => {
      vi.mocked(mockQueuesService.duplicateJob).mockResolvedValueOnce({
        jobId: 'new-job-456',
      });

      const input = { jobId: 'job-1', queueName: PLANS_QUEUE_NAME };
      const result = await resolver.duplicateJob(input);

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('new-job-456');
      expect(result.error).toBeNull();
      expect(mockQueuesService.duplicateJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
      );
    });

    test('returns DuplicateJobResultObject with success false and error when service returns error', async () => {
      vi.mocked(mockQueuesService.duplicateJob).mockResolvedValueOnce({
        error: 'Job not found',
      });

      const input = { jobId: 'job-1', queueName: PLANS_QUEUE_NAME };
      const result = await resolver.duplicateJob(input);

      expect(result.success).toBe(false);
      expect(result.jobId).toBeNull();
      expect(result.error).toBe('Job not found');
      expect(mockQueuesService.duplicateJob).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'job-1',
      );
    });
  });

  describe('removeRepeatableJob', () => {
    test('returns RemoveRepeatableJobResultObject with success when service returns removed', async () => {
      vi.mocked(mockQueuesService.removeRepeatableByKey).mockResolvedValueOnce({
        removed: true,
      });

      const input = {
        key: 'repeat:plans::abc-123',
        queueName: PLANS_QUEUE_NAME,
      };
      const result = await resolver.removeRepeatableJob(input);

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(mockQueuesService.removeRepeatableByKey).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'repeat:plans::abc-123',
      );
    });

    test('returns RemoveRepeatableJobResultObject with success false when service returns error', async () => {
      vi.mocked(mockQueuesService.removeRepeatableByKey).mockResolvedValueOnce({
        error: 'Repeatable job not found or could not be removed',
      });

      const input = { key: 'bad-key', queueName: PLANS_QUEUE_NAME };
      const result = await resolver.removeRepeatableJob(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Repeatable job not found or could not be removed',
      );
      expect(mockQueuesService.removeRepeatableByKey).toHaveBeenCalledWith(
        PLANS_QUEUE_NAME,
        'bad-key',
      );
    });
  });
});
