import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { AGENTIC_TEST_QUEUE_NAME } from './agentic-test.constants';
import { AgenticTestProcessor } from './agentic-test.processor';

@Module({
  exports: [BullModule],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(AGENTIC_TEST_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(AGENTIC_TEST_QUEUE_NAME),
  ],
  providers: [AgenticTestProcessor],
})
export class AgenticTestQueueModule {}
