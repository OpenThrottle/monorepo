import { Global, Module } from '@nestjs/common';
import { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import { PUB_SUB, type PubSubEngine } from '@openthrottle/nestjs-graphql';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { getBullMqRunOutputBaseDirectory } from '../config/bullmq-run-output';
import { createQueueJobLogTailPublisher } from '../graphql/queue-job-logs/queue-job-log-publisher';
import { BullMqRunOutputRetentionService } from './bullmq-run-output-retention.service';
import { BULLMQ_RUN_OUTPUT_WRITER } from './bullmq-run-output-writer.token';

/**
 * @description Registers a singleton {@link KeyedJsonlWriter} when `BULLMQ_RUN_OUTPUT_DIR` is set;
 * otherwise the injection token resolves to `undefined` (use `@Optional()` in processors).
 * The writer is wired with an `onAppend` observer (via the injected {@link PUB_SUB})
 * that publishes each appended record to the `queueJobLogTail` live-tail subscription
 * (OT plan 3c397432, task 3) — best-effort, single-process fan-out that never blocks the write.
 * {@link BullMqRunOutputRetentionService} is always registered for optional post-job pruning when retention env is set.
 */
@Global()
@Module({
  exports: [BULLMQ_RUN_OUTPUT_WRITER, BullMqRunOutputRetentionService],
  imports: [LoggerModule],
  providers: [
    BullMqRunOutputRetentionService,
    {
      inject: [PUB_SUB],
      provide: BULLMQ_RUN_OUTPUT_WRITER,
      useFactory: (pubSub: PubSubEngine): KeyedJsonlWriter | undefined => {
        const base = getBullMqRunOutputBaseDirectory();

        if (base === undefined) {
          return undefined;
        }

        return new KeyedJsonlWriter({
          onAppend: createQueueJobLogTailPublisher(pubSub),
          runOutputBaseDirectory: base,
        });
      },
    },
  ],
})
export class BullMqRunOutputModule {}
