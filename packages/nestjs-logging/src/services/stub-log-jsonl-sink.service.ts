import { Inject, Injectable } from '@nestjs/common';
import {
  NESTJS_LOGGING_MODULE_OPTIONS,
  type ResolvedNestjsLoggingModuleOptions,
} from '../config/nestjs-logging.options';
import type { LogJsonlSink, StructuredLogRecord } from '../ports/logging-ports';

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
