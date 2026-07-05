import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { AgenticTestQueueProducerModule } from './agentic-test-queue-producer.module';
import { AgenticTestProcessor } from './agentic-test.processor';

/**
 * @description Processor half of the agentic-test queue (WorkerHost). Loaded
 * only under PROCESS_ROLE worker/all; enqueue-only consumers import
 * {@link AgenticTestQueueProducerModule} instead.
 */
@Module({
  exports: [AgenticTestQueueProducerModule],
  imports: [AgenticTestQueueProducerModule, LoggerModule],
  providers: [AgenticTestProcessor],
})
export class AgenticTestQueueModule {}
