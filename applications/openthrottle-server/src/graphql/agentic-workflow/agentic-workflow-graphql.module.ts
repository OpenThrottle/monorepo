/**
 * @description GraphQL module for agentic-workflow. Imports {@link AgenticTestQueueProducerModule} for BullMQ agentic-test enqueue in follow-up mutations.
 */

import { Module } from '@nestjs/common';
import { AgenticTestQueueProducerModule } from '../../queues/agentic-test/agentic-test-queue-producer.module';
import { AgenticWorkflowResolver } from './agentic-workflow.resolver';
import { AgenticWorkflowService } from './agentic-workflow.service';

@Module({
  exports: [AgenticWorkflowService],
  imports: [AgenticTestQueueProducerModule],
  providers: [AgenticWorkflowResolver, AgenticWorkflowService],
})
export class AgenticWorkflowGraphqlModule {}
