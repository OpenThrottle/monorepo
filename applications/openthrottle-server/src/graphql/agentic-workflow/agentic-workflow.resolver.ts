/**
 * @description GraphQL resolver for agentic-workflow (agentic-test queue smoke enqueue).
 */

import { Mutation, Resolver } from '@nestjs/graphql';
import { AgenticWorkflowService } from './agentic-workflow.service';
import { EnqueueAgenticWorkflowMockResultObject } from './enqueue-agentic-workflow-mock-result.object';

@Resolver()
export class AgenticWorkflowResolver {
  constructor(
    private readonly agenticWorkflowService: AgenticWorkflowService,
  ) {}

  @Mutation(() => EnqueueAgenticWorkflowMockResultObject, {
    description:
      'Enqueue a deterministic mock payload on the agentic-test queue (agentic-workflow smoke path). Returns job metadata or error.',
  })
  async enqueueAgenticWorkflowMock(): Promise<EnqueueAgenticWorkflowMockResultObject> {
    const result = await this.agenticWorkflowService.enqueueMockAgenticTest();

    const out = new EnqueueAgenticWorkflowMockResultObject();
    if ('jobId' in result) {
      out.success = true;
      out.jobId = result.jobId;
      out.jobName = result.jobName;
      out.queueName = result.queueName;
      out.error = null;
    } else {
      out.success = false;
      out.jobId = null;
      out.jobName = null;
      out.queueName = null;
      out.error = result.error;
    }
    return out;
  }
}
