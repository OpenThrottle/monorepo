import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { queueName } from './<%= name %>.constants';
import { getConfiguration } from '~/common/config/configuration';
import { onModuleInitWorkerLogging } from '~/common/utils/bullmq';
import { <%= namePascal %>Job } from '~/queues/<%= name %>/<%= name %>.types';

@Processor(queueName, {
  autorun: getConfiguration().application.processor,
  concurrency: 1, // Default value
})
export class <%= namePascal %>Processor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    // private readonly xxxxxService: XxxxxService,
    private readonly logger: LoggerService,
  ) {
    super();
  }

  /**
   * @external https://docs.nestjs.com/fundamentals/lifecycle-events#lifecycle-events-1
   * @description Called once the host module's dependencies have been resolved.
   */
  async onModuleInit() {
    onModuleInitWorkerLogging(this.worker, this.logger);
  }

  /**
   * @external https://docs.nestjs.com/fundamentals/lifecycle-events#application-shutdown
   * @external https://docs.bullmq.io/guide/going-to-production#gracefully-shut-down-workers
   * @description Gracefully shut down the worker when the application shuts
   * down by implementing the `OnApplicationShutdown` interface provided by NestJS.
   */
  async onApplicationShutdown(signal: string) {
    this.logger.info(`onApplicationShutdown`, { signal });
    await this.worker.close();
  }

  async process(job: <%= namePascal %>Job) {
    this.logger.info('Processing job', {
      data: job.data,
      jobId: job.id,
      queueName,
    });

    // TODO: Implement the logic for the queue
    const response = {}

    this.logger.info('Processed job', {
      data: job.data,
      jobId: job.id,
      queueName,
      response,
    });
  }
}
