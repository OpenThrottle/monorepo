/**
 * @description GraphQL module for agentic-workflow. Imports {@link AgenticTestQueueProducerModule} for BullMQ agentic-test enqueue in follow-up mutations.
 */

import { Module } from '@nestjs/common';

import { AgenticTestQueueProducerModule } from '../../queues/agentic-test/agentic-test-queue-producer.module.ts';
import { AgenticWorkflowResolver } from './agentic-workflow.resolver.ts';
import { AgenticWorkflowService } from './agentic-workflow.service.ts';

@Module({
  exports: [AgenticWorkflowService],
  imports: [AgenticTestQueueProducerModule],
  providers: [AgenticWorkflowResolver, AgenticWorkflowService],
})
export class AgenticWorkflowGraphqlModule {}
