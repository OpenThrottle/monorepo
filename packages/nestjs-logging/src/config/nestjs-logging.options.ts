import type {
  ExecutionContext,
  FactoryProvider,
  ModuleMetadata,
} from '@nestjs/common';
import {
  createLogRedactor,
  type LogRedactor,
  type RedactionOptions,
} from '../services/log-redaction';
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
 * @description Per-connection authorization hook for the logging WebSocket gateway. Called in
 * `handleConnection` with the connecting Socket.IO socket; return `false` (or throw) to reject and
 * disconnect the client before it can issue any `logs.*` control message. Implementations typically
 * verify a token/cookie from `socket.handshake` against the host application's auth system.
 *
 * The log stream may contain secrets/PII; the namespace MUST be protected before enabling in
 * production. If omitted, every client that can reach the namespace can read the full log stream.
 */
export type NestjsLoggingWebsocketAuthorizeHook = (
  socket: unknown,
) => Promise<boolean> | boolean;

/**
 * @description Socket.IO streaming for log tail/replay (see `docs/openclaw-style-contract.md`). Disabled by default.
 */
export interface NestjsLoggingWebsocketOptions {
  /**
   * @description Explicit CORS allow-list of permitted request `Origin` values for the gateway's
   * Socket.IO handshake. When omitted or empty, no cross-origin requests are allowed (CORS is left
   * unset on the gateway). Never use a reflect-any-origin policy for a log stream — list the exact
   * origins (e.g. `['https://ops.example.com']`) that are allowed to connect.
   */
  readonly allowedOrigins?: ReadonlyArray<string> | undefined;
  /**
   * @description Per-connection authorization hook. The log stream is unauthenticated unless this is
   * provided; see {@link NestjsLoggingWebsocketAuthorizeHook}.
   */
  readonly authorize?: NestjsLoggingWebsocketAuthorizeHook | undefined;
  /**
   * @description When true, registers the logging WebSocket gateway (Socket.IO namespace from {@link NestjsLoggingWebsocketOptions.namespace}).
   */
  readonly enabled?: boolean | undefined;
  /**
   * @description Maximum buffered `log.record` payloads per connected socket before oldest events are dropped (backpressure).
   */
  readonly maxPendingRecordsPerSocket?: number | undefined;
  /**
   * @description Socket.IO namespace path (must start with `/`).
   */
  readonly namespace?: string | undefined;
}

/**
 * @description Durability level applied on each periodic flush of the JSONL sink.
 *
 * - `'none'`: skip the fsync entirely (rely on the OS page cache). Cheapest, weakest durability.
 * - `'datasync'`: `fdatasync` — flush file data without all inode metadata; cheaper than a full
 *   fsync on a hot log file under high write throughput.
 * - `'sync'`: `fsync` — flush data and metadata. Most durable but the most expensive per interval.
 *
 * Defaults to `'sync'` to preserve historical behavior. High-throughput services that find the
 * per-interval fsync costly should consider `'datasync'`.
 */
export type JsonlDurabilityLevel = 'datasync' | 'none' | 'sync';

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
   * @description Durability level applied on each periodic flush (see {@link JsonlDurabilityLevel}). Defaults to `'sync'`.
   */
  readonly durability?: JsonlDurabilityLevel | undefined;
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
   * @description Minimum levels written to JSONL and emitted on the hub (inclusive).
   */
  readonly levels?: ReadonlyArray<NestjsLoggingLevel> | undefined;
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
   * @description Secret/PII redaction policy applied to `message` and `extra` at the JSONL
   * chokepoint (file sink + every WebSocket emit path). Default-on with a sensible deny-list;
   * pass `false` to disable entirely (not recommended), or a {@link RedactionOptions} to customize.
   */
  readonly redaction?: RedactionOptions | false | undefined;
  /**
   * @description Rotation policy for the JSONL sink.
   */
  readonly rotation?: JsonlRotationPolicy | undefined;
  /**
   * @description Optional trace id extractor (OpenTelemetry, W3C traceparent, etc.).
   */
  readonly traceIdExtractor?: TraceIdExtractor;
  /**
   * @description Optional Socket.IO gateway for `logs.*` control messages and `log.*` pushes (requires host Socket.IO adapter).
   */
  readonly websocket?: NestjsLoggingWebsocketOptions | undefined;
}

/**
 * @description Async registration options for {@link NestjsLoggingModule.forRootAsync}.
 */
export interface NestjsLoggingModuleAsyncOptions {
  readonly imports?: ModuleMetadata['imports'];
  readonly inject?: FactoryProvider<NestjsLoggingModuleOptions>['inject'];
  readonly isGlobal?: boolean | undefined;
  /**
   * @description When true, registers the Socket.IO logging gateway (Nest needs the class at module definition time). Set when your async factory returns `websocket.enabled: true`.
   */
  readonly registerWebsocketGateway?: boolean | undefined;
  readonly useFactory: FactoryProvider<NestjsLoggingModuleOptions>['useFactory'];
  /**
   * @description Explicit CORS allow-list baked into the gateway's static {@link WebSocketGateway}
   * metadata when {@link NestjsLoggingModuleAsyncOptions.registerWebsocketGateway} is true. Socket.IO
   * CORS metadata is read at class-build time, before the async factory resolves, so it cannot be
   * derived from the factory result — declare the permitted origins here. Omit (or pass `[]`) to
   * forbid all cross-origin browser clients. Should match `websocket.allowedOrigins` from your factory.
   */
  readonly websocketGatewayAllowedOrigins?: ReadonlyArray<string> | undefined;
  /**
   * @description Namespace for the gateway when {@link NestjsLoggingModuleAsyncOptions.registerWebsocketGateway} is true; should match the resolved `websocket.namespace` from your factory (default `/ot-logging`).
   */
  readonly websocketGatewayNamespace?: string | undefined;
}

const DEFAULT_DURABILITY: JsonlDurabilityLevel = 'sync';
const DEFAULT_FILE_BASENAME = 'application';
const DEFAULT_FLUSH_MS = 1_000;
const DEFAULT_MAX_REPLAY_LINES = 10_000;
export const DEFAULT_MAX_PENDING_WS_RECORDS = 1_000;
export const DEFAULT_NESTJS_LOGGING_WS_NAMESPACE = '/ot-logging';
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
      | 'durability'
      | 'fileBasename'
      | 'flushIntervalMs'
      | 'levels'
      | 'maxReplayLines'
      | 'rotation'
      | 'websocket'
    >
  > &
    NestjsLoggingModuleOptions & {
      /**
       * @description Resolved redactor applied at the JSONL chokepoint (default-on).
       */
      readonly redactor: LogRedactor;
    }
> => {
  const websocketEnabled = options.websocket?.enabled === true;

  return {
    ...options,
    durability: options.durability ?? DEFAULT_DURABILITY,
    fileBasename: options.fileBasename ?? DEFAULT_FILE_BASENAME,
    flushIntervalMs: options.flushIntervalMs ?? DEFAULT_FLUSH_MS,
    levels: options.levels ?? ALL_NESTJS_LOGGING_LEVELS,
    maxReplayLines: options.maxReplayLines ?? DEFAULT_MAX_REPLAY_LINES,
    redactor: createLogRedactor(options.redaction),
    rotation: options.rotation ?? DEFAULT_ROTATION,
    websocket: {
      allowedOrigins: options.websocket?.allowedOrigins ?? [],
      authorize: options.websocket?.authorize,
      enabled: websocketEnabled,
      maxPendingRecordsPerSocket:
        options.websocket?.maxPendingRecordsPerSocket ??
        DEFAULT_MAX_PENDING_WS_RECORDS,
      namespace:
        options.websocket?.namespace ?? DEFAULT_NESTJS_LOGGING_WS_NAMESPACE,
    },
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

  const durability = opts.durability;

  if (
    durability !== undefined &&
    durability !== 'none' &&
    durability !== 'datasync' &&
    durability !== 'sync'
  ) {
    throw new NestjsLoggingError(
      `durability, when provided, must be "none", "datasync", or "sync". Got: ${String(durability)}.`,
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

  const redaction = opts.redaction;

  if (redaction !== undefined && redaction !== false) {
    if (typeof redaction !== 'object' || redaction === null) {
      throw new NestjsLoggingError(
        'redaction must be an object or false when provided.',
      );
    }

    const red = redaction as Record<string, unknown>;

    const keys = red.keys;

    if (
      keys !== undefined &&
      (!Array.isArray(keys) || keys.some((key) => typeof key !== 'string'))
    ) {
      throw new NestjsLoggingError(
        'redaction.keys, when provided, must be an array of strings.',
      );
    }

    const patterns = red.patterns;

    if (
      patterns !== undefined &&
      (!Array.isArray(patterns) ||
        patterns.some((pattern) => !(pattern instanceof RegExp)))
    ) {
      throw new NestjsLoggingError(
        'redaction.patterns, when provided, must be an array of RegExp.',
      );
    }

    const replacement = red.replacement;

    if (replacement !== undefined && typeof replacement !== 'string') {
      throw new NestjsLoggingError(
        'redaction.replacement, when provided, must be a string.',
      );
    }

    const redactMessage = red.redactMessage;

    if (redactMessage !== undefined && typeof redactMessage !== 'boolean') {
      throw new NestjsLoggingError(
        'redaction.redactMessage, when provided, must be a boolean.',
      );
    }
  }

  const websocket = opts.websocket;

  if (websocket !== undefined) {
    if (typeof websocket !== 'object' || websocket === null) {
      throw new NestjsLoggingError(
        'websocket must be an object when provided.',
      );
    }

    const ws = websocket as Record<string, unknown>;
    const enabled = ws.enabled;

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      throw new NestjsLoggingError(
        'websocket.enabled, when provided, must be a boolean.',
      );
    }

    const namespace = ws.namespace;

    if (
      namespace !== undefined &&
      (typeof namespace !== 'string' ||
        namespace.trim() === '' ||
        !namespace.startsWith('/'))
    ) {
      throw new NestjsLoggingError(
        'websocket.namespace, when provided, must be a non-empty string starting with "/".',
      );
    }

    const maxPending = ws.maxPendingRecordsPerSocket;

    if (
      maxPending !== undefined &&
      (typeof maxPending !== 'number' || !isPositiveInt(maxPending))
    ) {
      throw new NestjsLoggingError(
        'websocket.maxPendingRecordsPerSocket, when provided, must be a positive integer.',
      );
    }

    const authorize = ws.authorize;

    if (authorize !== undefined && typeof authorize !== 'function') {
      throw new NestjsLoggingError(
        'websocket.authorize, when provided, must be a function.',
      );
    }

    const allowedOrigins = ws.allowedOrigins;

    if (allowedOrigins !== undefined) {
      if (!Array.isArray(allowedOrigins)) {
        throw new NestjsLoggingError(
          'websocket.allowedOrigins, when provided, must be an array of strings.',
        );
      }

      if (
        allowedOrigins.some(
          (origin) => typeof origin !== 'string' || origin.trim() === '',
        )
      ) {
        throw new NestjsLoggingError(
          'websocket.allowedOrigins must contain only non-empty strings.',
        );
      }
    }
  }
};

/**
 * @description Validates async module registration options (sync fields on {@link NestjsLoggingModuleAsyncOptions}).
 */
export const validateNestjsLoggingModuleAsyncOptions = (
  options: NestjsLoggingModuleAsyncOptions,
): void => {
  const register = options.registerWebsocketGateway;

  if (register !== undefined && typeof register !== 'boolean') {
    throw new NestjsLoggingError(
      'registerWebsocketGateway, when provided, must be a boolean.',
    );
  }

  const gatewayNs = options.websocketGatewayNamespace;

  if (
    gatewayNs !== undefined &&
    (typeof gatewayNs !== 'string' ||
      gatewayNs.trim() === '' ||
      !gatewayNs.startsWith('/'))
  ) {
    throw new NestjsLoggingError(
      'websocketGatewayNamespace, when provided, must be a non-empty string starting with "/".',
    );
  }

  const gatewayAllowedOrigins = options.websocketGatewayAllowedOrigins;

  if (gatewayAllowedOrigins !== undefined) {
    if (!Array.isArray(gatewayAllowedOrigins)) {
      throw new NestjsLoggingError(
        'websocketGatewayAllowedOrigins, when provided, must be an array of strings.',
      );
    }

    if (
      gatewayAllowedOrigins.some(
        (origin) => typeof origin !== 'string' || origin.trim() === '',
      )
    ) {
      throw new NestjsLoggingError(
        'websocketGatewayAllowedOrigins must contain only non-empty strings.',
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

  return input as NestjsLoggingModuleOptions;
};
