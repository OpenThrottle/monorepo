import { type DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  applyNestjsLoggingModuleDefaults,
  NESTJS_LOGGING_MODULE_OPTIONS,
  type NestjsLoggingModuleAsyncOptions,
  type NestjsLoggingModuleOptions,
  parseNestjsLoggingModuleOptions,
  validateNestjsLoggingModuleOptions,
} from './config/nestjs-logging.options';
import { NestjsLoggingService } from './nestjs-logging.service';
import { StubLogJsonlSink } from './services/stub-log-jsonl-sink.service';
import { StubLogStreamHub } from './services/stub-log-stream-hub.service';
import { LOG_JSONL_SINK, LOG_STREAM_HUB } from './tokens/nestjs-logging.tokens';

@Module({})
export class NestjsLoggingModule {
  /**
   * @description Register logging with static options (validated and merged with defaults).
   */
  static forRoot(options: NestjsLoggingModuleOptions): DynamicModule {
    validateNestjsLoggingModuleOptions(options);
    const resolved = applyNestjsLoggingModuleDefaults(options);

    return {
      exports: [
        LOG_JSONL_SINK,
        LOG_STREAM_HUB,
        NestjsLoggingService,
        NESTJS_LOGGING_MODULE_OPTIONS,
        StubLogJsonlSink,
        StubLogStreamHub,
      ],
      global: options.isGlobal === true,
      imports: [LoggerModule],
      module: NestjsLoggingModule,
      providers: [
        NestjsLoggingService,
        StubLogJsonlSink,
        StubLogStreamHub,
        { provide: LOG_JSONL_SINK, useExisting: StubLogJsonlSink },
        { provide: LOG_STREAM_HUB, useExisting: StubLogStreamHub },
        { provide: NESTJS_LOGGING_MODULE_OPTIONS, useValue: resolved },
      ],
    };
  }

  /**
   * @description Register logging when options come from ConfigService or another async factory.
   */
  static forRootAsync(options: NestjsLoggingModuleAsyncOptions): DynamicModule {
    return {
      exports: [
        LOG_JSONL_SINK,
        LOG_STREAM_HUB,
        NestjsLoggingService,
        NESTJS_LOGGING_MODULE_OPTIONS,
        StubLogJsonlSink,
        StubLogStreamHub,
      ],
      global: options.isGlobal === true,
      imports: [LoggerModule, ...(options.imports ?? [])],
      module: NestjsLoggingModule,
      providers: [
        NestjsLoggingService,
        StubLogJsonlSink,
        StubLogStreamHub,
        { provide: LOG_JSONL_SINK, useExisting: StubLogJsonlSink },
        { provide: LOG_STREAM_HUB, useExisting: StubLogStreamHub },
        {
          inject: options.inject ?? [],
          provide: NESTJS_LOGGING_MODULE_OPTIONS,
          useFactory: async (
            ...args: Parameters<
              NonNullable<NestjsLoggingModuleAsyncOptions['useFactory']>
            >
          ) => {
            const raw: unknown = await options.useFactory(...args);

            return applyNestjsLoggingModuleDefaults(
              parseNestjsLoggingModuleOptions(raw),
            );
          },
        },
      ],
    };
  }
}
