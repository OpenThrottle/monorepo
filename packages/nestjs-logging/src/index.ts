export { NestjsLoggingError } from './config/nestjs-logging.error.ts';
export {
  applyNestjsLoggingModuleDefaults,
  type CorrelationIdExtractor,
  DEFAULT_MAX_PENDING_WS_RECORDS,
  DEFAULT_NESTJS_LOGGING_WS_NAMESPACE,
  type JsonlDurabilityLevel,
  type JsonlRotationPolicy,
  NESTJS_LOGGING_MODULE_OPTIONS,
  type NestjsLoggingModuleAsyncOptions,
  type NestjsLoggingModuleOptions,
  type NestjsLoggingWebsocketAuthorizeHook,
  type NestjsLoggingWebsocketOptions,
  parseNestjsLoggingModuleOptions,
  type ResolvedNestjsLoggingModuleOptions,
  type TraceIdExtractor,
  validateNestjsLoggingModuleAsyncOptions,
  validateNestjsLoggingModuleOptions,
} from './config/nestjs-logging.options.ts';
export {
  ALL_NESTJS_LOGGING_LEVELS,
  NESTJS_LOGGING_LEVELS,
  type NestjsLoggingLevel,
} from './config/nestjs-logging-levels.ts';
export {
  buildNestjsLoggingWebsocketGatewayClass,
  recordMatchesLogSubscriptionFilter,
} from './gateways/nestjs-logging-websocket.gateway.ts';
export { NestjsLoggingModule } from './nestjs-logging.module.ts';
export { NestjsLoggingService } from './nestjs-logging.service.ts';
export type {
  JsonPrimitive,
  JsonValue,
  LogJsonlSink,
  LogReplayChunk,
  LogStreamHub,
  StructuredLogRecord,
} from './ports/logging-ports.ts';
export { FileBackedLogStreamHub } from './services/file-backed-log-stream-hub.service.ts';
export { FileLogJsonlSink } from './services/file-log-jsonl-sink.service.ts';
export {
  orderJsonlRootObjectKeys,
  parseJsonlLineToStructuredRecord,
  serializeStructuredLogLine,
  structuredLogRecordToJsonlPayload,
} from './services/jsonl-payload.ts';
export {
  type KeyedJsonlRunLine,
  readKeyedJsonlRun,
  type ReadKeyedJsonlRunOptions,
  type ReadKeyedJsonlRunParams,
  type ReadKeyedJsonlRunResult,
} from './services/keyed-jsonl-reader.ts';
export { KeyedJsonlWriterError } from './services/keyed-jsonl-writer.error.ts';
export {
  type KeyedJsonlRunChunkInput,
  type KeyedJsonlRunRecord,
  KeyedJsonlWriter,
  type KeyedJsonlWriterOptions,
} from './services/keyed-jsonl-writer.ts';
export {
  pruneKeyedRunOutputDirectory,
  type PruneKeyedRunOutputDirectoryParams,
  type PruneKeyedRunOutputDirectoryResult,
} from './services/keyed-run-output-retention.ts';
export {
  createLogRedactor,
  DEFAULT_LOG_REDACTOR,
  DEFAULT_REDACTION_KEYS,
  DEFAULT_REDACTION_PATTERNS,
  DEFAULT_REDACTION_REPLACEMENT,
  type LogRedactor,
  type RedactionOptions,
} from './services/log-redaction.ts';
export { StubLogJsonlSink } from './services/stub-log-jsonl-sink.service.ts';
export { StubLogStreamHub } from './services/stub-log-stream-hub.service.ts';
export {
  LOG_JSONL_SINK,
  LOG_STREAM_HUB,
} from './tokens/nestjs-logging.tokens.ts';
