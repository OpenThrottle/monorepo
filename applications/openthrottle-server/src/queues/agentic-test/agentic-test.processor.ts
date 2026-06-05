import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { runAgenticTestEchoLoop } from './agentic-test-echo';
import {
  AGENTIC_TEST_QUEUE_NAME,
  AGENTIC_TEST_WORKER_LOCK_DURATION_MS,
} from './agentic-test.constants';
import type {
  AgenticTestJob,
  AgenticTestJobResult,
} from './agentic-test.types';
import { getOpenThrottleRoot } from '@openthrottle/openthrottle-agentic-utils';

const CONCURRENCY = 1;

/**
 * @description Smoke-test BullMQ worker: logs the current ISO timestamp once per second for ~30s, then completes.
 */
@Processor(AGENTIC_TEST_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
  lockDuration: AGENTIC_TEST_WORKER_LOCK_DURATION_MS,
})
export class AgenticTestProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  private readonly prefix = '[agentic-test]';

  constructor(private readonly logger: LoggerService) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Agentic-test queue worker started (concurrency=${CONCURRENCY})`,
      AgenticTestProcessor.name,
    );
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.info(
      `Agentic-test queue worker shutting down (signal=${signal ?? 'unknown'})`,
      AgenticTestProcessor.name,
    );

    await this.worker.close();
  }

  async process(job: AgenticTestJob): Promise<AgenticTestJobResult> {
    const root = getOpenThrottleRoot();

    this.logger.info(
      `${this.prefix} job started: jobId=${job.id}`,
      AgenticTestProcessor.name,
      root,
    );

    const result = await runAgenticTestEchoLoop({
      echoCount: 3,
      onEcho: (timestamp, index) => {
        job.log(`${this.prefix} | echo ${index + 1}: ${timestamp}`);

        // if (index === 2) {
        //   throw new Error('Test error');
        // }

        this.logger.info(
          `${this.prefix} echo ${index + 1}: ${timestamp}`,
          AgenticTestProcessor.name,
        );

        job.updateProgress(Math.round(((index + 1) / 3) * 100));
      },
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    });

    job.log(`${this.prefix} job completed`);
    this.logger.info(
      `${this.prefix} job completed: jobId=${job.id}, echoedCount=${result.echoedCount}`,
      AgenticTestProcessor.name,
    );

    return result;
  }

  @OnWorkerEvent('active')
  onActive(job: AgenticTestJob) {
    const message = `${this.prefix} Job ${job.id} has started processing.`;

    job.log(message);
    this.logger.info(message);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: AgenticTestJob, result: any) {
    const message = `${this.prefix} Job ${job.id} completed successfully. Result: ${JSON.stringify(result)}`;

    job.log(message);
    this.logger.info(message);
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    const message = `${this.prefix} A queue-level error occurred: ${error.message}`;

    this.logger.error(message);
  }

  @OnWorkerEvent('failed')
  onFailed(job: AgenticTestJob, error: Error) {
    const message = `${this.prefix} Job ${job.id} failed with error: ${error.message}`;

    job.log(message);
    this.logger.error(message, error.stack);
  }
}
