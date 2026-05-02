import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  NESTJS_LOGGING_MODULE_OPTIONS,
  type ResolvedNestjsLoggingModuleOptions,
} from './config/nestjs-logging.options';

@Injectable()
export class NestjsLoggingService {
  constructor(
    private readonly logger: LoggerService,
    @Inject(NESTJS_LOGGING_MODULE_OPTIONS)
    private readonly options: ResolvedNestjsLoggingModuleOptions,
  ) {
    this.logger.debug(
      `nestjs-logging: JSONL directory="${this.options.logDirectory}" basename="${this.options.fileBasename}"`,
    );
  }

  /**
   * @description Resolved module options (defaults applied) for callers that need paths or limits.
   */
  getResolvedOptions(): ResolvedNestjsLoggingModuleOptions {
    return this.options;
  }
}
