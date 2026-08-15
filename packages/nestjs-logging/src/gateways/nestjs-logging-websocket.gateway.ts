import { randomUUID } from 'node:crypto';
import { stat } from 'node:fs/promises';
import * as path from 'node:path';
import type { OnModuleDestroy, Type } from '@nestjs/common';
import { Inject, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { isRecord } from '@openthrottle/nodejs-utils';
import type { Server } from 'socket.io';
import type { Socket } from 'socket.io';
import {
  DEFAULT_MAX_PENDING_WS_RECORDS,
  NESTJS_LOGGING_MODULE_OPTIONS,
  type ResolvedNestjsLoggingModuleOptions,
} from '../config/nestjs-logging.options';
import type { LogStreamHub, StructuredLogRecord } from '../ports/logging-ports';
import { getActiveJsonlRelativePath } from '../services/get-active-jsonl-relative-path';
import { structuredLogRecordToJsonlPayload } from '../services/jsonl-payload';
import type { LogRedactor } from '../services/log-redaction';
import { LOG_STREAM_HUB } from '../tokens/nestjs-logging.tokens';

interface LogSubscriptionFilter {
  readonly contexts: ReadonlySet<string> | undefined;
  readonly levels: ReadonlySet<string> | undefined;
}

interface ConnectedLogClientState {
  flushScheduled: boolean;
  hubUnsubscribe: (() => void) | undefined;
  readonly maxPending: number;
  pendingRecords: StructuredLogRecord[];
  readonly redactor: LogRedactor;
  readonly subscriptionFilters: Map<string, LogSubscriptionFilter>;
  tailFollowSubscriptionId: string | undefined;
}

const connectedClients = new WeakMap<Socket, ConnectedLogClientState>();

/**
 * @description Whether a structured record matches a single subscription filter (empty sets mean all).
 */
export const recordMatchesLogSubscriptionFilter = (
  record: StructuredLogRecord,
  filter: LogSubscriptionFilter,
): boolean => {
  if (
    filter.levels !== undefined &&
    filter.levels.size > 0 &&
    !filter.levels.has(record.level)
  ) {
    return false;
  }

  if (
    filter.contexts !== undefined &&
    filter.contexts.size > 0 &&
    !filter.contexts.has(record.context)
  ) {
    return false;
  }

  return true;
};

const recordMatchesAnySubscription = (
  record: StructuredLogRecord,
  filters: ReadonlyMap<string, LogSubscriptionFilter>,
): boolean => {
  if (filters.size === 0) {
    return false;
  }

  for (const filter of filters.values()) {
    if (recordMatchesLogSubscriptionFilter(record, filter)) {
      return true;
    }
  }

  return false;
};

type ParseStringArrayFieldResult =
  | { error: string; ok: false }
  | { ok: true; value: ReadonlySet<string> | undefined };

const parseStringArrayField = (
  raw: unknown,
  field: string,
): ParseStringArrayFieldResult => {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(raw)) {
    return {
      error: `${field} must be an array of strings when provided.`,
      ok: false,
    };
  }

  if (raw.length === 0) {
    return { ok: true, value: undefined };
  }

  if (!raw.every((item) => typeof item === 'string')) {
    return { error: `${field} must contain only strings.`, ok: false };
  }

  return { ok: true, value: new Set(raw) };
};

type ParsePositiveIntResult =
  { error: string; ok: false } | { ok: true; value: number };

const parsePositiveInt = (
  raw: unknown,
  field: string,
  fallback: number,
  max: number,
): ParsePositiveIntResult => {
  if (raw === undefined) {
    return { ok: true, value: Math.min(fallback, max) };
  }

  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
    return { error: `${field} must be a positive integer.`, ok: false };
  }

  return { ok: true, value: Math.min(raw, max) };
};

const drainPendingRecords = (
  socket: Socket,
  state: ConnectedLogClientState,
): void => {
  while (state.pendingRecords.length > 0) {
    const rec = state.pendingRecords.shift();

    if (rec !== undefined) {
      socket.emit('log.record', {
        record: structuredLogRecordToJsonlPayload(rec, state.redactor),
      });
    }
  }
};

const enqueueRecordForSocket = (
  socket: Socket,
  state: ConnectedLogClientState,
  record: StructuredLogRecord,
): void => {
  state.pendingRecords.push(record);

  let dropped = false;

  while (state.pendingRecords.length > state.maxPending) {
    state.pendingRecords.shift();
    dropped = true;
  }

  if (dropped) {
    socket.emit('log.notice', {
      detail: 'Oldest pending log.record events were dropped for this socket.',
      type: 'backpressure',
    });
  }

  if (!state.flushScheduled) {
    state.flushScheduled = true;
    queueMicrotask(() => {
      state.flushScheduled = false;
      drainPendingRecords(socket, state);
    });
  }
};

const ensureHubPipe = (
  client: Socket,
  state: ConnectedLogClientState,
  hub: LogStreamHub,
): void => {
  if (state.hubUnsubscribe !== undefined) {
    return;
  }

  state.hubUnsubscribe = hub.subscribe((record) => {
    if (!recordMatchesAnySubscription(record, state.subscriptionFilters)) {
      return;
    }

    enqueueRecordForSocket(client, state, record);
  });
};

const disposeClient = (
  client: Socket,
  state: ConnectedLogClientState,
): void => {
  state.hubUnsubscribe?.();
  state.hubUnsubscribe = undefined;
  state.subscriptionFilters.clear();
  state.pendingRecords.length = 0;
  state.tailFollowSubscriptionId = undefined;
  connectedClients.delete(client);
};

/**
 * @description Builds a Socket.IO gateway class for the given namespace (Nest reads {@link WebSocketGateway} metadata from the generated subclass).
 *
 * `allowedOrigins` becomes the explicit CORS `origin` allow-list for the handshake — there is no
 * reflect-any-origin (`origin: true`) fallback. When the list is empty, CORS is left unset so no
 * cross-origin browser client is permitted. Per-connection identity is enforced separately at
 * runtime via the injected `websocket.authorize` hook in `handleConnection`.
 */
export const buildNestjsLoggingWebsocketGatewayClass = (
  namespace: string,
  allowedOrigins: ReadonlyArray<string> = [],
): Type<object> => {
  const corsOrigins = [...allowedOrigins];

  @WebSocketGateway({
    ...(corsOrigins.length > 0 ? { cors: { origin: corsOrigins } } : {}),
    namespace,
  })
  class NestjsLoggingWebsocketGatewayImpl
    implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
  {
    private readonly logger = new Logger(
      NestjsLoggingWebsocketGatewayImpl.name,
    );

    @WebSocketServer()
    server!: Server;

    constructor(
      @Inject(LOG_STREAM_HUB) private readonly hub: LogStreamHub,
      @Inject(NESTJS_LOGGING_MODULE_OPTIONS)
      private readonly moduleOptions: ResolvedNestjsLoggingModuleOptions,
    ) {}

    async handleConnection(client: Socket): Promise<void> {
      if (this.moduleOptions.websocket.enabled !== true) {
        client.disconnect(true);

        return;
      }

      const authorize = this.moduleOptions.websocket.authorize;

      if (authorize !== undefined) {
        let authorized = false;

        try {
          authorized = await authorize(client);
        } catch (error) {
          this.logger.warn(
            `Rejecting logging WebSocket connection: authorize hook threw: ${String(error)}`,
          );
          client.disconnect(true);

          return;
        }

        if (authorized !== true) {
          this.logger.verbose(
            'Rejecting logging WebSocket connection: authorize hook returned false.',
          );
          client.disconnect(true);

          return;
        }
      }

      const maxPending =
        this.moduleOptions.websocket.maxPendingRecordsPerSocket ??
        DEFAULT_MAX_PENDING_WS_RECORDS;
      const state: ConnectedLogClientState = {
        flushScheduled: false,
        hubUnsubscribe: undefined,
        maxPending,
        pendingRecords: [],
        redactor: this.moduleOptions.redactor,
        subscriptionFilters: new Map(),
        tailFollowSubscriptionId: undefined,
      };

      connectedClients.set(client, state);
    }

    handleDisconnect(client: Socket): void {
      const state = connectedClients.get(client);

      if (state !== undefined) {
        disposeClient(client, state);
      }
    }

    onModuleDestroy(): void {
      if (this.server === undefined) {
        return;
      }

      this.server.disconnectSockets(true);
    }

    @SubscribeMessage('logs.subscribe')
    onLogsSubscribe(
      @ConnectedSocket() client: Socket,
      @MessageBody() body: unknown,
    ): { error: string; ok: false } | { ok: true; subscriptionId: string } {
      const state = connectedClients.get(client);

      if (state === undefined) {
        return { error: 'Socket is not initialized.', ok: false };
      }

      if (!isRecord(body)) {
        return { error: 'Payload must be a JSON object.', ok: false };
      }

      const payload = body;
      const levelsResult = parseStringArrayField(payload.levels, 'levels');

      if (!levelsResult.ok) {
        return { error: levelsResult.error, ok: false };
      }

      const contextsResult = parseStringArrayField(
        payload.contexts,
        'contexts',
      );

      if (!contextsResult.ok) {
        return { error: contextsResult.error, ok: false };
      }

      const filter: LogSubscriptionFilter = {
        contexts: contextsResult.value,
        levels: levelsResult.value,
      };
      const subscriptionId = randomUUID();

      state.subscriptionFilters.set(subscriptionId, filter);
      ensureHubPipe(client, state, this.hub);

      return { ok: true, subscriptionId };
    }

    @SubscribeMessage('logs.unsubscribe')
    onLogsUnsubscribe(
      @ConnectedSocket() client: Socket,
      @MessageBody() body: unknown,
    ): { error: string; ok: false } | { ok: true } {
      const state = connectedClients.get(client);

      if (state === undefined) {
        return { error: 'Socket is not initialized.', ok: false };
      }

      if (!isRecord(body)) {
        return { error: 'Payload must be a JSON object.', ok: false };
      }

      const subscriptionId = body.subscriptionId;

      if (typeof subscriptionId !== 'string' || subscriptionId.trim() === '') {
        return { error: 'subscriptionId is required.', ok: false };
      }

      state.subscriptionFilters.delete(subscriptionId);

      if (state.tailFollowSubscriptionId === subscriptionId) {
        state.tailFollowSubscriptionId = undefined;
      }

      if (state.subscriptionFilters.size === 0) {
        state.hubUnsubscribe?.();
        state.hubUnsubscribe = undefined;
      }

      return { ok: true };
    }

    @SubscribeMessage('logs.history')
    async onLogsHistory(
      @MessageBody() body: unknown,
    ): Promise<
      | { error: string; lines?: undefined; ok: false }
      | { lines: ReadonlyArray<Readonly<Record<string, unknown>>>; ok: true }
    > {
      if (!isRecord(body)) {
        return { error: 'Payload must be a JSON object.', ok: false };
      }

      const payload = body;
      const maxLinesResult = parsePositiveInt(
        payload.maxLines,
        'maxLines',
        this.moduleOptions.maxReplayLines,
        this.moduleOptions.maxReplayLines,
      );

      if (!maxLinesResult.ok) {
        return { error: maxLinesResult.error, ok: false };
      }

      const lines = await this.hub.readReplayTailLines(maxLinesResult.value);

      return {
        lines: lines.map((r) =>
          structuredLogRecordToJsonlPayload(r, this.moduleOptions.redactor),
        ),
        ok: true,
      };
    }

    @SubscribeMessage('logs.replay')
    async onLogsReplay(@MessageBody() body: unknown): Promise<
      | { error: string; ok: false }
      | {
          lines: ReadonlyArray<Readonly<Record<string, unknown>>>;
          nextByteOffset: number;
          ok: true;
        }
    > {
      if (!isRecord(body)) {
        return { error: 'Payload must be a JSON object.', ok: false };
      }

      const payload = body;
      const fromRaw = payload.fromByteOffset;
      const fromByteOffset =
        fromRaw === undefined
          ? 0
          : typeof fromRaw === 'number' &&
              Number.isInteger(fromRaw) &&
              fromRaw >= 0
            ? fromRaw
            : undefined;

      if (fromByteOffset === undefined) {
        return {
          error: 'fromByteOffset must be a non-negative integer.',
          ok: false,
        };
      }

      const maxLinesResult = parsePositiveInt(
        payload.maxLines,
        'maxLines',
        this.moduleOptions.maxReplayLines,
        this.moduleOptions.maxReplayLines,
      );

      if (!maxLinesResult.ok) {
        return { error: maxLinesResult.error, ok: false };
      }

      const chunk = await this.hub.readReplayFromByteOffset(fromByteOffset);
      const capped = chunk.records.slice(0, maxLinesResult.value);

      return {
        lines: capped.map((r) =>
          structuredLogRecordToJsonlPayload(r, this.moduleOptions.redactor),
        ),
        nextByteOffset: chunk.nextByteOffset,
        ok: true,
      };
    }

    @SubscribeMessage('logs.tail')
    async onLogsTail(
      @ConnectedSocket() client: Socket,
      @MessageBody() body: unknown,
    ): Promise<
      | { error: string; ok: false }
      | {
          cursor: { byteOffset: number; path: string };
          lines: ReadonlyArray<Readonly<Record<string, unknown>>>;
          ok: true;
        }
    > {
      if (!isRecord(body)) {
        return { error: 'Payload must be a JSON object.', ok: false };
      }

      const payload = body;

      if (typeof payload.follow !== 'boolean') {
        return { error: 'follow must be a boolean.', ok: false };
      }

      const maxLinesResult = parsePositiveInt(
        payload.maxLines,
        'maxLines',
        this.moduleOptions.maxReplayLines,
        this.moduleOptions.maxReplayLines,
      );

      if (!maxLinesResult.ok) {
        return { error: maxLinesResult.error, ok: false };
      }

      const lines = await this.hub.readReplayTailLines(maxLinesResult.value);
      const relative = getActiveJsonlRelativePath(this.moduleOptions);
      const fullPath = path.join(this.moduleOptions.logDirectory, relative);
      let byteOffset = 0;

      try {
        const st = await stat(fullPath);

        byteOffset = st.size;
      } catch (error) {
        this.logger.verbose(
          `logs.tail: could not stat active JSONL at "${fullPath}": ${String(error)}`,
        );
      }

      if (payload.follow === true) {
        const state = connectedClients.get(client);

        if (state === undefined) {
          return { error: 'Socket is not initialized.', ok: false };
        }

        if (state.tailFollowSubscriptionId !== undefined) {
          state.subscriptionFilters.delete(state.tailFollowSubscriptionId);
        }

        const subscriptionId = randomUUID();
        const followFilter: LogSubscriptionFilter = {
          contexts: undefined,
          levels: undefined,
        };

        state.subscriptionFilters.set(subscriptionId, followFilter);
        state.tailFollowSubscriptionId = subscriptionId;
        ensureHubPipe(client, state, this.hub);
      }

      return {
        cursor: { byteOffset, path: relative },
        lines: lines.map((r) =>
          structuredLogRecordToJsonlPayload(r, this.moduleOptions.redactor),
        ),
        ok: true,
      };
    }
  }

  // Nest `Type<object>` is the dynamic provider token; the generated class satisfies it at runtime.

  return NestjsLoggingWebsocketGatewayImpl;
};
