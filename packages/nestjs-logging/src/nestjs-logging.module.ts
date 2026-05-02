import { type DynamicModule, Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import {
  applyNestjsLoggingModuleDefaults,
  DEFAULT_NESTJS_LOGGING_WS_NAMESPACE,
  NESTJS_LOGGING_MODULE_OPTIONS,
  type NestjsLoggingModuleAsyncOptions,
  type NestjsLoggingModuleOptions,
  parseNestjsLoggingModuleOptions,
  validateNestjsLoggingModuleAsyncOptions,
  validateNestjsLoggingModuleOptions,
} from './config/nestjs-logging.options';
import { buildNestjsLoggingWebsocketGatewayClass } from './gateways/nestjs-logging-websocket.gateway';
import { NestjsLoggingService } from './nestjs-logging.service';
import { FileBackedLogStreamHub } from './services/file-backed-log-stream-hub.service';
import { FileLogJsonlSink } from './services/file-log-jsonl-sink.service';
import { LOG_JSONL_SINK, LOG_STREAM_HUB } from './tokens/nestjs-logging.tokens';

@Module({})
export class NestjsLoggingModule {
  /**
   * @description Register logging with static options (validated and merged with defaults).
   */
  static forRoot(options: NestjsLoggingModuleOptions): DynamicModule {
    validateNestjsLoggingModuleOptions(options);
    const resolved = applyNestjsLoggingModuleDefaults(options);
    const websocketGatewayProviders =
      resolved.websocket.enabled === true
        ? [
            buildNestjsLoggingWebsocketGatewayClass(
              resolved.websocket.namespace ??
                DEFAULT_NESTJS_LOGGING_WS_NAMESPACE,
            ),
          ]
        : [];

    return {
      exports: [
        LOG_JSONL_SINK,
        LOG_STREAM_HUB,
        NestjsLoggingService,
        NESTJS_LOGGING_MODULE_OPTIONS,
        FileBackedLogStreamHub,
        FileLogJsonlSink,
        ...websocketGatewayProviders,
      ],
      global: options.isGlobal === true,
      imports: [LoggerModule],
      module: NestjsLoggingModule,
      providers: [
        NestjsLoggingService,
        FileBackedLogStreamHub,
        FileLogJsonlSink,
        { provide: LOG_JSONL_SINK, useExisting: FileLogJsonlSink },
        { provide: LOG_STREAM_HUB, useExisting: FileBackedLogStreamHub },
        { provide: NESTJS_LOGGING_MODULE_OPTIONS, useValue: resolved },
        ...websocketGatewayProviders,
      ],
    };
  }

  /**
   * @description Register logging when options come from ConfigService or another async factory.
   */
  static forRootAsync(options: NestjsLoggingModuleAsyncOptions): DynamicModule {
    validateNestjsLoggingModuleAsyncOptions(options);
    const websocketGatewayProviders =
      options.registerWebsocketGateway === true
        ? [
            buildNestjsLoggingWebsocketGatewayClass(
              options.websocketGatewayNamespace ??
                DEFAULT_NESTJS_LOGGING_WS_NAMESPACE,
            ),
          ]
        : [];

    return {
      exports: [
        LOG_JSONL_SINK,
        LOG_STREAM_HUB,
        NestjsLoggingService,
        NESTJS_LOGGING_MODULE_OPTIONS,
        FileBackedLogStreamHub,
        FileLogJsonlSink,
        ...websocketGatewayProviders,
      ],
      global: options.isGlobal === true,
      imports: [LoggerModule, ...(options.imports ?? [])],
      module: NestjsLoggingModule,
      providers: [
        NestjsLoggingService,
        FileBackedLogStreamHub,
        FileLogJsonlSink,
        {
          provide: LOG_JSONL_SINK,
          useExisting: FileLogJsonlSink,
        },
        {
          provide: LOG_STREAM_HUB,
          useExisting: FileBackedLogStreamHub,
        },
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
        ...websocketGatewayProviders,
      ],
    };
  }
}
