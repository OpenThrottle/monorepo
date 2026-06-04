/**
 * @description Service for agentic-workflow GraphQL mutations (agentic-test queue enqueue).
 */

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  AGENTIC_TEST_JOB_NAME,
  AGENTIC_TEST_QUEUE_NAME,
} from '../../queues/agentic-test/agentic-test.constants';
import type {
  AgenticTestJobPayload,
  AgenticTestJobResult,
} from '../../queues/agentic-test/agentic-test.types';
import { AGENTIC_WORKFLOW_MOCK_PAYLOAD } from './agentic-workflow-mock-payload';

@Injectable()
export class AgenticWorkflowService {
  constructor(
    @InjectQueue(AGENTIC_TEST_QUEUE_NAME)
    private readonly agenticTestQueue: Queue<
      AgenticTestJobPayload,
      AgenticTestJobResult
    >,
  ) {}

  /**
   * @description Enqueues a deterministic mock job on the agentic-test queue for processor smoke runs.
   */
  async enqueueMockAgenticTest(): Promise<
    | { jobId: string; jobName: string; queueName: string }
    | { error: string }
  > {
    const job = await this.agenticTestQueue.add(
      AGENTIC_TEST_JOB_NAME,
      AGENTIC_WORKFLOW_MOCK_PAYLOAD,
    );
    if (job.id == null) {
      return { error: 'Failed to get new job id' };
    }

    return {
      jobId: String(job.id),
      jobName: job.name ?? AGENTIC_TEST_JOB_NAME,
      queueName: AGENTIC_TEST_QUEUE_NAME,
    };
  }
}
