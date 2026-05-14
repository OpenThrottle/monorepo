import { Global, Module } from '@nestjs/common';
import { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { getBullMqRunOutputBaseDirectory } from '../config/bullmq-run-output';
import { BullMqRunOutputRetentionService } from './bullmq-run-output-retention.service';
import { BULLMQ_RUN_OUTPUT_WRITER } from './bullmq-run-output-writer.token';

/**
 * @description Registers a singleton {@link KeyedJsonlWriter} when `OT_BULLMQ_RUN_OUTPUT_DIR` is set;
 * otherwise the injection token resolves to `undefined` (use `@Optional()` in processors).
 * {@link BullMqRunOutputRetentionService} is always registered for optional post-job pruning when retention env is set.
 */
@Global()
@Module({
  exports: [BULLMQ_RUN_OUTPUT_WRITER, BullMqRunOutputRetentionService],
  imports: [LoggerModule],
  providers: [
    BullMqRunOutputRetentionService,
    {
      provide: BULLMQ_RUN_OUTPUT_WRITER,
      useFactory: (): KeyedJsonlWriter | undefined => {
        const base = getBullMqRunOutputBaseDirectory();

        if (base === undefined) {
          return undefined;
        }

        return new KeyedJsonlWriter({ runOutputBaseDirectory: base });
      },
    },
  ],
})
export class BullMqRunOutputModule {}
