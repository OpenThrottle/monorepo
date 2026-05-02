import type {
  ExecutionContext,
  FactoryProvider,
  ModuleMetadata,
} from '@nestjs/common';
import { NestjsLoggingError } from './nestjs-logging.error';
import {
  ALL_NESTJS_LOGGING_LEVELS,
  type NestjsLoggingLevel,
} from './nestjs-logging-levels';

/**
 * @description Injection token for resolved {@link NestjsLoggingModuleOptions} (including defaults).
 */
export const NESTJS_LOGGING_MODULE_OPTIONS =
  'NESTJS_LOGGING_MODULE_OPTIONS' as const;

/**
 * @description Derive correlation (or trace) identifiers from the current Nest execution context when logging from HTTP/GraphQL/etc.
 */
export type CorrelationIdExtractor = (
  ctx: ExecutionContext,
) => string | undefined;

/**
 * @description Trace identifier extractor (e.g. W3C traceparent), parallel to {@link CorrelationIdExtractor}.
 */
export type TraceIdExtractor = (ctx: ExecutionContext) => string | undefined;

/**
 * @description File rotation strategy for JSONL sinks.
 */
export type JsonlRotationPolicy =
  | {
      readonly keepFiles: number;
      readonly maxBytes: number;
      readonly type: 'size';
    }
  | { readonly maxFiles: number; readonly type: 'daily' }
  | { readonly type: 'none' };

/**
 * @description Static registration options for {@link NestjsLoggingModule.forRoot}.
 */
export interface NestjsLoggingModuleOptions {
  /**
   * @description Optional extractor for correlation id (e.g. `x-request-id` header via `ctx.switchToHttp().getRequest()`).
   */
  readonly correlationIdExtractor?: CorrelationIdExtractor;
  /**
   * @description Base file name without extension; files are `{basename}.jsonl` unless {@link NestjsLoggingModuleOptions.fileNamePattern} is set.
   */
  readonly fileBasename?: string;
  /**
   * @description Optional pattern for file naming / rotation segments (interpreted by the file sink implementation).
   */
  readonly fileNamePattern?: string;
  /**
   * @description Periodic flush interval for the JSONL sink (milliseconds).
   */
  readonly flushIntervalMs?: number | undefined;
  /**
   * @description When true, register dynamic module as global.
   */
  readonly isGlobal?: boolean | undefined;
  /**
   * @description Absolute or process-relative directory for JSONL files.
   */
  readonly logDirectory: string;
  /**
   * @description Maximum approximate bytes to read when replaying history for late subscribers.
   */
  readonly maxReplayBytes?: number | undefined;
  /**
   * @description Maximum line count to replay from tail of the JSONL file.
   */
  readonly maxReplayLines?: number | undefined;
  /**
   * @description Minimum levels written to JSONL and emitted on the hub (inclusive).
   */
  readonly levels?: ReadonlyArray<NestjsLoggingLevel> | undefined;
  /**
   * @description Rotation policy for the JSONL sink.
   */
  readonly rotation?: JsonlRotationPolicy | undefined;
  /**
   * @description Optional trace id extractor (OpenTelemetry, W3C traceparent, etc.).
   */
  readonly traceIdExtractor?: TraceIdExtractor;
}

/**
 * @description Async registration options for {@link NestjsLoggingModule.forRootAsync}.
 */
export interface NestjsLoggingModuleAsyncOptions {
  readonly imports?: ModuleMetadata['imports'];
  readonly inject?: FactoryProvider<NestjsLoggingModuleOptions>['inject'];
  readonly isGlobal?: boolean | undefined;
  readonly useFactory: FactoryProvider<NestjsLoggingModuleOptions>['useFactory'];
}

const DEFAULT_FILE_BASENAME = 'application';
const DEFAULT_FLUSH_MS = 1_000;
const DEFAULT_MAX_REPLAY_LINES = 10_000;
const DEFAULT_ROTATION: JsonlRotationPolicy = { type: 'none' };

/**
 * @description Applies defaults for optional fields; does not validate (use {@link validateNestjsLoggingModuleOptions}).
 */
export const applyNestjsLoggingModuleDefaults = (
  options: NestjsLoggingModuleOptions,
): Readonly<
  Required<
    Pick<
      NestjsLoggingModuleOptions,
      | 'fileBasename'
      | 'flushIntervalMs'
      | 'levels'
      | 'maxReplayLines'
      | 'rotation'
    >
  > &
    NestjsLoggingModuleOptions
> => {
  return {
    ...options,
    fileBasename: options.fileBasename ?? DEFAULT_FILE_BASENAME,
    flushIntervalMs: options.flushIntervalMs ?? DEFAULT_FLUSH_MS,
    levels: options.levels ?? ALL_NESTJS_LOGGING_LEVELS,
    maxReplayLines: options.maxReplayLines ?? DEFAULT_MAX_REPLAY_LINES,
    rotation: options.rotation ?? DEFAULT_ROTATION,
  };
};

/**
 * @description Options after {@link applyNestjsLoggingModuleDefaults}.
 */
export type ResolvedNestjsLoggingModuleOptions = ReturnType<
  typeof applyNestjsLoggingModuleDefaults
>;

const isPositiveInt = (n: number): boolean => Number.isInteger(n) && n > 0;

/**
 * @description Validates module options at bootstrap.
 * @throws NestjsLoggingError when required fields or numeric bounds are invalid.
 */
export const validateNestjsLoggingModuleOptions = (options: unknown): void => {
  if (options === null || options === undefined) {
    throw new NestjsLoggingError(
      'NestjsLoggingModuleOptions are required. Pass { logDirectory } to forRoot() or return them from forRootAsync().useFactory().',
    );
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- runtime guard narrows unknown
  const opts = options as Record<string, unknown>;
  const logDirectory = opts.logDirectory;

  if (typeof logDirectory !== 'string' || logDirectory.trim() === '') {
    throw new NestjsLoggingError(
      'logDirectory is required and must be a non-empty string.',
    );
  }

  const fileBasename = opts.fileBasename;

  if (
    fileBasename !== undefined &&
    (typeof fileBasename !== 'string' || fileBasename.trim() === '')
  ) {
    throw new NestjsLoggingError(
      'fileBasename, when provided, must be a non-empty string.',
    );
  }

  const fileNamePattern = opts.fileNamePattern;

  if (
    fileNamePattern !== undefined &&
    (typeof fileNamePattern !== 'string' || fileNamePattern.trim() === '')
  ) {
    throw new NestjsLoggingError(
      'fileNamePattern, when provided, must be a non-empty string.',
    );
  }

  const flushIntervalMs = opts.flushIntervalMs;

  if (
    flushIntervalMs !== undefined &&
    (typeof flushIntervalMs !== 'number' || !isPositiveInt(flushIntervalMs))
  ) {
    throw new NestjsLoggingError(
      'flushIntervalMs, when provided, must be a positive integer (milliseconds).',
    );
  }

  const maxReplayBytes = opts.maxReplayBytes;

  if (
    maxReplayBytes !== undefined &&
    (typeof maxReplayBytes !== 'number' || !isPositiveInt(maxReplayBytes))
  ) {
    throw new NestjsLoggingError(
      'maxReplayBytes, when provided, must be a positive integer.',
    );
  }

  const maxReplayLines = opts.maxReplayLines;

  if (
    maxReplayLines !== undefined &&
    (typeof maxReplayLines !== 'number' || !isPositiveInt(maxReplayLines))
  ) {
    throw new NestjsLoggingError(
      'maxReplayLines, when provided, must be a positive integer.',
    );
  }

  const levels = opts.levels;

  if (levels !== undefined) {
    if (!Array.isArray(levels) || levels.length === 0) {
      throw new NestjsLoggingError(
        'levels, when provided, must be a non-empty array of NestjsLoggingLevel values.',
      );
    }

    const allowed = new Set<string>(ALL_NESTJS_LOGGING_LEVELS);

    for (const level of levels) {
      if (typeof level !== 'string' || !allowed.has(level)) {
        throw new NestjsLoggingError(
          `levels contains invalid entry "${String(level)}". Expected one of: ${[
            ...allowed,
          ].join(', ')}.`,
        );
      }
    }
  }

  const rotation = opts.rotation;

  if (rotation !== undefined) {
    if (typeof rotation !== 'object' || rotation === null) {
      throw new NestjsLoggingError('rotation must be an object when provided.');
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const rot = rotation as Record<string, unknown>;
    const type = rot.type;

    if (type === 'none') {
      // valid
    } else if (type === 'size') {
      const maxBytes = rot.maxBytes;
      const keepFiles = rot.keepFiles;

      if (typeof maxBytes !== 'number' || !isPositiveInt(maxBytes)) {
        throw new NestjsLoggingError(
          'rotation type "size" requires positive integer maxBytes.',
        );
      }

      if (typeof keepFiles !== 'number' || !isPositiveInt(keepFiles)) {
        throw new NestjsLoggingError(
          'rotation type "size" requires positive integer keepFiles.',
        );
      }
    } else if (type === 'daily') {
      const maxFiles = rot.maxFiles;

      if (typeof maxFiles !== 'number' || !isPositiveInt(maxFiles)) {
        throw new NestjsLoggingError(
          'rotation type "daily" requires positive integer maxFiles.',
        );
      }
    } else {
      throw new NestjsLoggingError(
        `rotation.type must be "none", "size", or "daily". Got: ${String(type)}.`,
      );
    }
  }
};

/**
 * @description Validates then returns the same object reference as {@link NestjsLoggingModuleOptions}.
 */
export const parseNestjsLoggingModuleOptions = (
  input: unknown,
): NestjsLoggingModuleOptions => {
  validateNestjsLoggingModuleOptions(input);

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- narrowed after validate
  return input as NestjsLoggingModuleOptions;
};
