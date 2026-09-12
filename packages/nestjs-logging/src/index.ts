export { NestjsLoggingError } from './config/nestjs-logging.error';
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
} from './config/nestjs-logging.options';
export {
  ALL_NESTJS_LOGGING_LEVELS,
  NESTJS_LOGGING_LEVELS,
  type NestjsLoggingLevel,
} from './config/nestjs-logging-levels';
export {
  buildNestjsLoggingWebsocketGatewayClass,
  recordMatchesLogSubscriptionFilter,
} from './gateways/nestjs-logging-websocket.gateway';
export { NestjsLoggingModule } from './nestjs-logging.module';
export { NestjsLoggingService } from './nestjs-logging.service';
export type {
  JsonPrimitive,
  JsonValue,
  LogJsonlSink,
  LogReplayChunk,
  LogStreamHub,
  StructuredLogRecord,
} from './ports/logging-ports';
export { FileBackedLogStreamHub } from './services/file-backed-log-stream-hub.service';
export { FileLogJsonlSink } from './services/file-log-jsonl-sink.service';
export {
  orderJsonlRootObjectKeys,
  parseJsonlLineToStructuredRecord,
  serializeStructuredLogLine,
  structuredLogRecordToJsonlPayload,
} from './services/jsonl-payload';
export {
  type KeyedJsonlRunLine,
  readKeyedJsonlRun,
  type ReadKeyedJsonlRunOptions,
  type ReadKeyedJsonlRunParams,
  type ReadKeyedJsonlRunResult,
} from './services/keyed-jsonl-reader';
export {
  type KeyedJsonlRunChunkInput,
  type KeyedJsonlRunRecord,
  KeyedJsonlWriter,
  type KeyedJsonlWriterOptions,
} from './services/keyed-jsonl-writer';
export { KeyedJsonlWriterError } from './services/keyed-jsonl-writer.error';
export {
  pruneKeyedRunOutputDirectory,
  type PruneKeyedRunOutputDirectoryParams,
  type PruneKeyedRunOutputDirectoryResult,
} from './services/keyed-run-output-retention';
export {
  createLogRedactor,
  DEFAULT_LOG_REDACTOR,
  DEFAULT_REDACTION_KEYS,
  DEFAULT_REDACTION_PATTERNS,
  DEFAULT_REDACTION_REPLACEMENT,
  type LogRedactor,
  type RedactionOptions,
} from './services/log-redaction';
export { StubLogJsonlSink } from './services/stub-log-jsonl-sink.service';
export { StubLogStreamHub } from './services/stub-log-stream-hub.service';
export { LOG_JSONL_SINK, LOG_STREAM_HUB } from './tokens/nestjs-logging.tokens';
