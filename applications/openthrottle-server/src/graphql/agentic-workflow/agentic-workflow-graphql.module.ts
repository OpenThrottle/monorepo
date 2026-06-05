/**
 * @description GraphQL module for agentic-workflow. Imports {@link AgenticTestQueueModule} for BullMQ agentic-test enqueue in follow-up mutations.
 */

import { Module } from '@nestjs/common';
import { AgenticTestQueueModule } from '../../queues/agentic-test/agentic-test-queue.module';
import { AgenticWorkflowResolver } from './agentic-workflow.resolver';
import { AgenticWorkflowService } from './agentic-workflow.service';

@Module({
  exports: [AgenticWorkflowService],
  imports: [AgenticTestQueueModule],
  providers: [AgenticWorkflowResolver, AgenticWorkflowService],
})
export class AgenticWorkflowGraphqlModule {}
