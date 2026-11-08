import { Inject, Injectable } from '@nestjs/common';

import type { ResolvedNestjsLoggingModuleOptions } from '../config/nestjs-logging.options.ts';
import { NESTJS_LOGGING_MODULE_OPTIONS } from '../config/nestjs-logging.options.ts';
import type {
  LogJsonlSink,
  StructuredLogRecord,
} from '../ports/ports.types.ts';

/**
 * @description Placeholder sink until the JSONL file implementation lands; keeps DI graph stable.
 */
@Injectable()
export class StubLogJsonlSink implements LogJsonlSink {
  constructor(
    @Inject(NESTJS_LOGGING_MODULE_OPTIONS)
    private readonly options: ResolvedNestjsLoggingModuleOptions,
  ) {}

  append(_record: StructuredLogRecord): void {
    void _record;
    void this.options.logDirectory;
  }

  flush(): void {
    // no-op
  }
}
