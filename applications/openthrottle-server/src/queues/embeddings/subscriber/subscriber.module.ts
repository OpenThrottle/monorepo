import { Module } from '@nestjs/common';

import { EmbeddingsQueueProducerModule } from '../producer/producer.module.ts';
import { EmbeddingsSubscriberService } from './subscriber.service.ts';

/**
 * @description Registers {@link EmbeddingsSubscriberService} on the default DataSource. Imported
 * under every PROCESS_ROLE, because both the API and the worker write plans and tasks.
 */
@Module({
  imports: [EmbeddingsQueueProducerModule],
  providers: [EmbeddingsSubscriberService],
})
export class EmbeddingsSubscriberModule {}
