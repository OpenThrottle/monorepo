/**
 * @description Unit tests for {@link AgenticWorkflowResolver}.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  AGENTIC_TEST_JOB_NAME,
  AGENTIC_TEST_QUEUE_NAME,
} from '../../queues/agentic-test/agentic-test.constants';
import { AgenticWorkflowResolver } from './agentic-workflow.resolver';
import { AgenticWorkflowService } from './agentic-workflow.service';

describe('AgenticWorkflowResolver', () => {
  let resolver: AgenticWorkflowResolver;

  const mockAgenticWorkflowService = createMock<AgenticWorkflowService>({
    enqueueMockAgenticTest: vi.fn(),
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AgenticWorkflowResolver,
        {
          provide: AgenticWorkflowService,
          useValue: mockAgenticWorkflowService,
        },
      ],
    }).compile();

    resolver = moduleRef.get(AgenticWorkflowResolver);
  });

  describe('enqueueAgenticWorkflowMock', () => {
    test('returns success and job metadata when service enqueues mock payload', async () => {
      vi.mocked(
        mockAgenticWorkflowService.enqueueMockAgenticTest,
      ).mockResolvedValueOnce({
        jobId: 'agentic-workflow-mock-job-id',
        jobName: AGENTIC_TEST_JOB_NAME,
        queueName: AGENTIC_TEST_QUEUE_NAME,
      });

      const result = await resolver.enqueueAgenticWorkflowMock();

      expect(
        mockAgenticWorkflowService.enqueueMockAgenticTest,
      ).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.jobId).toBe('agentic-workflow-mock-job-id');
      expect(result.jobName).toBe(AGENTIC_TEST_JOB_NAME);
      expect(result.queueName).toBe(AGENTIC_TEST_QUEUE_NAME);
      expect(result.error).toBeNull();
    });

    test('returns failure when service reports enqueue error', async () => {
      vi.mocked(
        mockAgenticWorkflowService.enqueueMockAgenticTest,
      ).mockResolvedValueOnce({ error: 'queue unavailable' });

      const result = await resolver.enqueueAgenticWorkflowMock();

      expect(result.success).toBe(false);
      expect(result.jobId).toBeNull();
      expect(result.jobName).toBeNull();
      expect(result.queueName).toBeNull();
      expect(result.error).toBe('queue unavailable');
    });
  });
});
