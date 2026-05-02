export { NestjsLoggingError } from './config/nestjs-logging.error';
export {
  ALL_NESTJS_LOGGING_LEVELS,
  NESTJS_LOGGING_LEVELS,
  type NestjsLoggingLevel,
} from './config/nestjs-logging-levels';
export {
  applyNestjsLoggingModuleDefaults,
  type CorrelationIdExtractor,
  DEFAULT_MAX_PENDING_WS_RECORDS,
  DEFAULT_NESTJS_LOGGING_WS_NAMESPACE,
  type JsonlRotationPolicy,
  NESTJS_LOGGING_MODULE_OPTIONS,
  type NestjsLoggingModuleAsyncOptions,
  type NestjsLoggingModuleOptions,
  type NestjsLoggingWebsocketOptions,
  parseNestjsLoggingModuleOptions,
  type ResolvedNestjsLoggingModuleOptions,
  type TraceIdExtractor,
  validateNestjsLoggingModuleAsyncOptions,
  validateNestjsLoggingModuleOptions,
} from './config/nestjs-logging.options';
export {
  buildNestjsLoggingWebsocketGatewayClass,
  recordMatchesLogSubscriptionFilter,
} from './gateways/nestjs-logging-websocket.gateway';
export { NestjsLoggingModule } from './nestjs-logging.module';
export { NestjsLoggingService } from './nestjs-logging.service';
export type {
  LogJsonlSink,
  LogReplayChunk,
  LogStreamHub,
  StructuredLogRecord,
} from './ports/logging-ports';
export { FileBackedLogStreamHub } from './services/file-backed-log-stream-hub.service';
export { FileLogJsonlSink } from './services/file-log-jsonl-sink.service';
export { StubLogJsonlSink } from './services/stub-log-jsonl-sink.service';
export {
  parseJsonlLineToStructuredRecord,
  serializeStructuredLogLine,
  structuredLogRecordToJsonlPayload,
} from './services/jsonl-payload';
export { StubLogStreamHub } from './services/stub-log-stream-hub.service';
export { LOG_JSONL_SINK, LOG_STREAM_HUB } from './tokens/nestjs-logging.tokens';
