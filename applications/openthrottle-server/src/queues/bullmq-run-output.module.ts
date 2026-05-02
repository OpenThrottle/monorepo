import { Global, Module } from '@nestjs/common';
import { KeyedJsonlWriter } from '@openthrottle/nestjs-logging';
import { getBullMqRunOutputBaseDirectory } from '../config/bullmq-run-output';
import { BULLMQ_RUN_OUTPUT_WRITER } from './bullmq-run-output-writer.token';

/**
 * @description Registers a singleton {@link KeyedJsonlWriter} when `OT_BULLMQ_RUN_OUTPUT_DIR` is set;
 * otherwise the injection token resolves to `undefined` (use `@Optional()` in processors).
 */
@Global()
@Module({
  exports: [BULLMQ_RUN_OUTPUT_WRITER],
  providers: [
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
