import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { AGENTIC_TEST_QUEUE_NAME } from './agentic-test.constants';

/**
 * @description Producer half of the agentic-test queue: registerQueue (enqueue
 * capability) + Bull Board listing, no WorkerHost. Safe under any PROCESS_ROLE;
 * the processor lives in {@link AgenticTestQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(AGENTIC_TEST_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(AGENTIC_TEST_QUEUE_NAME),
  ],
})
export class AgenticTestQueueProducerModule {}
