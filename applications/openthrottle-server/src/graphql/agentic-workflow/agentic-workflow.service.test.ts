/**
 * @description Unit tests for {@link AgenticWorkflowService}.
 */

import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { Job, Queue } from 'bullmq';
import { createMock } from '@golevelup/ts-vitest';
import {
  AGENTIC_TEST_JOB_NAME,
  AGENTIC_TEST_QUEUE_NAME,
} from '../../queues/agentic-test/agentic-test.constants';
import type {
  AgenticTestJobPayload,
  AgenticTestJobResult,
} from '../../queues/agentic-test/agentic-test.types';
import { AGENTIC_WORKFLOW_MOCK_PAYLOAD } from './agentic-workflow-mock-payload';
import { AgenticWorkflowService } from './agentic-workflow.service';

describe('AgenticWorkflowService', () => {
  let service: AgenticWorkflowService;

  const mockAgenticTestAdd = vi.fn().mockResolvedValue(
    createMock<Job<AgenticTestJobPayload, AgenticTestJobResult>>({
      id: 'agentic-workflow-mock-job-id',
      name: AGENTIC_TEST_JOB_NAME,
    }),
  );

  const mockAgenticTestQueue = createMock<
    Queue<AgenticTestJobPayload, AgenticTestJobResult>
  >({
    add: mockAgenticTestAdd,
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgenticWorkflowService,
        {
          provide: getQueueToken(AGENTIC_TEST_QUEUE_NAME),
          useValue: mockAgenticTestQueue,
        },
      ],
    }).compile();

    service = app.get(AgenticWorkflowService);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('enqueueMockAgenticTest', () => {
    test('returns job metadata and enqueues deterministic mock payload', async () => {
      mockAgenticTestAdd.mockClear();

      const result = await service.enqueueMockAgenticTest();

      expect(result).toEqual({
        jobId: 'agentic-workflow-mock-job-id',
        jobName: AGENTIC_TEST_JOB_NAME,
        queueName: AGENTIC_TEST_QUEUE_NAME,
      });
      expect(mockAgenticTestAdd).toHaveBeenCalledTimes(1);
      expect(mockAgenticTestAdd).toHaveBeenCalledWith(
        AGENTIC_TEST_JOB_NAME,
        AGENTIC_WORKFLOW_MOCK_PAYLOAD,
      );
    });

    test('returns error when BullMQ job has no id', async () => {
      mockAgenticTestAdd.mockResolvedValueOnce(
        createMock<Job<AgenticTestJobPayload, AgenticTestJobResult>>({
          id: undefined,
        }),
      );

      const result = await service.enqueueMockAgenticTest();

      expect(result).toEqual({ error: 'Failed to get new job id' });
    });
  });
});
