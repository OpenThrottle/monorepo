/**
 * @description GraphQL resolver for agentic-workflow (agentic-test queue smoke enqueue).
 */

import { Mutation, Resolver } from '@nestjs/graphql';
import { EnqueueAgenticTestResultObject } from '../queues/enqueue-agentic-test-result.object';
import { AgenticWorkflowService } from './agentic-workflow.service';

@Resolver()
export class AgenticWorkflowResolver {
  constructor(
    private readonly agenticWorkflowService: AgenticWorkflowService,
  ) {}

  @Mutation(() => EnqueueAgenticTestResultObject, {
    description:
      'Enqueue a deterministic mock payload on the agentic-test queue (agentic-workflow smoke path). Returns job id or error.',
  })
  async enqueueAgenticWorkflowMock(): Promise<EnqueueAgenticTestResultObject> {
    const result = await this.agenticWorkflowService.enqueueMockAgenticTest();

    const out = new EnqueueAgenticTestResultObject();
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
}
