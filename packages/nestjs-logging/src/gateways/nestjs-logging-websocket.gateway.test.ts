import { mkdtemp, writeFile } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Test } from '@nestjs/testing';
import type { Socket } from 'socket.io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyNestjsLoggingModuleDefaults,
  NESTJS_LOGGING_MODULE_OPTIONS,
} from '../config/nestjs-logging.options';
import { NESTJS_LOGGING_LEVELS } from '../config/nestjs-logging-levels';
import type { LogStreamHub, StructuredLogRecord } from '../ports/logging-ports';
import { LOG_STREAM_HUB } from '../tokens/nestjs-logging.tokens';
import {
  buildNestjsLoggingWebsocketGatewayClass,
  recordMatchesLogSubscriptionFilter,
} from './nestjs-logging-websocket.gateway';

const baseRecord = (): StructuredLogRecord => ({
  context: 'AppService',
  correlationId: undefined,
  level: 'log',
  message: 'hello',
  timestampIso: '2026-05-02T12:00:00.000Z',
  traceId: undefined,
});

describe('recordMatchesLogSubscriptionFilter', () => {
  it('matches when level and context filters are empty (all)', () => {
    const record = baseRecord();

    expect(
      recordMatchesLogSubscriptionFilter(record, {
        contexts: undefined,
        levels: undefined,
      }),
    ).toBe(true);
  });

  it('matches when level filter includes the record level', () => {
    const record = baseRecord();

    expect(
      recordMatchesLogSubscriptionFilter(record, {
        contexts: undefined,
        levels: new Set(['log', 'error']),
      }),
    ).toBe(true);
  });

  it('does not match when level filter excludes the record level', () => {
    const record = baseRecord();

    expect(
      recordMatchesLogSubscriptionFilter(record, {
        contexts: undefined,
        levels: new Set(['error']),
      }),
    ).toBe(false);
  });

  it('matches when context filter includes the record context', () => {
    const record = baseRecord();

    expect(
      recordMatchesLogSubscriptionFilter(record, {
        contexts: new Set(['AppService']),
        levels: undefined,
      }),
    ).toBe(true);
  });

  it('does not match when context filter excludes the record context', () => {
    const record = baseRecord();

    expect(
      recordMatchesLogSubscriptionFilter(record, {
        contexts: new Set(['Other']),
        levels: undefined,
      }),
    ).toBe(false);
  });
});

const hubRecord = (message: string): StructuredLogRecord => ({
  context: 'WsTest',
  correlationId: undefined,
  level: NESTJS_LOGGING_LEVELS.log,
  message,
  timestampIso: '2026-05-02T12:00:00.000Z',
  traceId: undefined,
});

interface MockLogSocket {
  readonly client: Socket;
  readonly disconnect: ReturnType<typeof vi.fn>;
  readonly emit: ReturnType<typeof vi.fn>;
}

/**
 * @description Minimal Socket.IO stub for gateway tests (only `emit` / `disconnect` are used).
 */
const createMockSocket = (): MockLogSocket => {
  const disconnect = vi.fn();
  const emit = vi.fn();
  const stub = { disconnect, emit };

  return {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Socket.IO `Socket` is a large interface; gateway tests only need emit/disconnect.
    client: stub as Socket,
    disconnect,
    emit,
  };
};

describe('NestjsLoggingWebsocketGateway (handlers)', () => {
  let logDirectory: string;

  beforeEach(async () => {
    logDirectory = await mkdtemp(
      path.join(os.tmpdir(), 'nestjs-logging-ws-gateway-'),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const compileGateway = async (
    hub: LogStreamHub,
    resolved: ReturnType<typeof applyNestjsLoggingModuleDefaults>,
  ) => {
    const GatewayClass = buildNestjsLoggingWebsocketGatewayClass(
      resolved.websocket.namespace ?? '/ot-logging',
    );
    const moduleRef = await Test.createTestingModule({
      providers: [
        GatewayClass,
        { provide: LOG_STREAM_HUB, useValue: hub },
        { provide: NESTJS_LOGGING_MODULE_OPTIONS, useValue: resolved },
      ],
    }).compile();

    return moduleRef.get(GatewayClass);
  };

  it('disconnects the socket when websocket is disabled on connection', async () => {
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: vi.fn(() => () => undefined),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      websocket: { enabled: false },
    });
    const gateway = await compileGateway(hub, resolved);
    const { client, disconnect } = createMockSocket();

    gateway.handleConnection(client);

    expect(disconnect).toHaveBeenCalledWith(true);
  });

  it('logs.subscribe returns an error when the socket was not initialized', async () => {
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: vi.fn(() => () => undefined),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);
    const { client } = createMockSocket();

    const ack = gateway.onLogsSubscribe(client, {});

    expect(ack).toEqual({ error: 'Socket is not initialized.', ok: false });
  });

  it('logs.unsubscribe validates payload and subscriptionId', async () => {
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: vi.fn(() => () => undefined),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);
    const { client } = createMockSocket();

    gateway.handleConnection(client);

    expect(gateway.onLogsUnsubscribe(client, null)).toMatchObject({
      ok: false,
    });
    expect(gateway.onLogsUnsubscribe(client, {})).toMatchObject({ ok: false });
    expect(
      gateway.onLogsUnsubscribe(client, { subscriptionId: '   ' }),
    ).toMatchObject({ ok: false });
  });

  it('handleDisconnect unsubscribes the hub when the client had an active subscription', async () => {
    const hubUnsubscribe = vi.fn();
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: vi.fn(() => hubUnsubscribe),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);
    const { client } = createMockSocket();

    gateway.handleConnection(client);
    gateway.onLogsSubscribe(client, {});
    gateway.handleDisconnect(client);

    expect(hubUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('onModuleDestroy disconnects all sockets on the server', async () => {
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: vi.fn(() => () => undefined),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);
    const disconnectSockets = vi.fn();

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- minimal Socket.IO server stub
    gateway.server = { disconnectSockets } as unknown as typeof gateway.server;

    gateway.onModuleDestroy();

    expect(disconnectSockets).toHaveBeenCalledWith(true);
  });

  it('logs.subscribe validates payload shape and level/context arrays', async () => {
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: vi.fn(() => () => undefined),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);
    const { client } = createMockSocket();

    gateway.handleConnection(client);

    expect(gateway.onLogsSubscribe(client, null)).toMatchObject({
      ok: false,
    });
    expect(gateway.onLogsSubscribe(client, { levels: 'oops' })).toMatchObject({
      ok: false,
    });
    expect(gateway.onLogsSubscribe(client, { contexts: [1, 2] })).toMatchObject(
      {
        ok: false,
      },
    );
  });

  it('logs.subscribe wires the hub and logs.unsubscribe tears it down when last filter is removed', async () => {
    const hubUnsubscribe = vi.fn();
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: vi.fn(() => hubUnsubscribe),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);
    const { client } = createMockSocket();

    gateway.handleConnection(client);

    const sub = gateway.onLogsSubscribe(client, { levels: ['log'] });

    expect(sub.ok).toBe(true);
    expect(hub.subscribe).toHaveBeenCalledTimes(1);

    if (!sub.ok) {
      throw new Error('expected subscribe ok');
    }

    expect(
      gateway.onLogsUnsubscribe(client, { subscriptionId: sub.subscriptionId }),
    ).toEqual({ ok: true });

    expect(hubUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('logs.history forwards maxLines capped by module maxReplayLines', async () => {
    const tailLines: StructuredLogRecord[] = [hubRecord('a')];
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => tailLines),
      subscribe: vi.fn(() => () => undefined),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      maxReplayLines: 50,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);

    const ok = await gateway.onLogsHistory({ maxLines: 200 });

    expect(hub.readReplayTailLines).toHaveBeenCalledWith(50);
    expect(ok).toMatchObject({ ok: true });
    if (!('lines' in ok) || !ok.ok) {
      throw new Error('expected history ok');
    }

    expect(ok.lines).toHaveLength(1);
    expect(ok.lines[0]).toMatchObject({ message: 'a' });
  });

  it('logs.history rejects invalid maxLines', async () => {
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: vi.fn(() => () => undefined),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);

    const bad = await gateway.onLogsHistory({ maxLines: 0 });

    expect(bad).toMatchObject({ ok: false });
  });

  it('logs.replay validates fromByteOffset and caps lines from the hub chunk', async () => {
    const records: StructuredLogRecord[] = [
      hubRecord('one'),
      hubRecord('two'),
      hubRecord('three'),
    ];
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 999,
        records,
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: vi.fn(() => () => undefined),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      maxReplayLines: 50,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);

    const invalid = await gateway.onLogsReplay({
      fromByteOffset: -1,
      maxLines: 10,
    });

    expect(invalid).toMatchObject({ ok: false });

    const ok = await gateway.onLogsReplay({
      fromByteOffset: 0,
      maxLines: 2,
    });

    expect(ok.ok).toBe(true);
    if (!ok.ok) {
      throw new Error('expected replay ok');
    }

    expect(ok.lines).toHaveLength(2);
    expect(ok.lines.map((l) => l.message)).toEqual(['one', 'two']);
    expect(ok.nextByteOffset).toBe(999);
  });

  it('logs.tail requires follow boolean and returns cursor when the active file exists', async () => {
    const relative = 'application.jsonl';
    const fullPath = path.join(logDirectory, relative);

    await writeFile(
      fullPath,
      `${JSON.stringify({
        context: 'T',
        level: 'log',
        message: 'line',
        timestamp: '2026-05-02T12:00:00.000Z',
      })}\n`,
      'utf8',
    );

    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => [hubRecord('line')]),
      subscribe: vi.fn(() => () => undefined),
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      fileBasename: 'application',
      logDirectory,
      websocket: { enabled: true },
    });
    const gateway = await compileGateway(hub, resolved);
    const { client } = createMockSocket();

    gateway.handleConnection(client);

    const missingFollow = await gateway.onLogsTail(client, { maxLines: 5 });

    expect(missingFollow).toMatchObject({ ok: false });

    const snapshot = await gateway.onLogsTail(client, {
      follow: false,
      maxLines: 5,
    });

    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) {
      throw new Error('expected tail ok');
    }

    expect(snapshot.lines).toHaveLength(1);
    expect(snapshot.cursor.path).toBe(relative);
    expect(snapshot.cursor.byteOffset).toBeGreaterThan(0);

    const follow = await gateway.onLogsTail(client, {
      follow: true,
      maxLines: 5,
    });

    expect(follow.ok).toBe(true);
    expect(hub.subscribe).toHaveBeenCalled();
  });

  it('emits backpressure notice when pending records exceed the per-socket cap', async () => {
    const hubUnsubscribe = vi.fn();
    const hubSubscribe = vi.fn(() => hubUnsubscribe);
    const hub: LogStreamHub = {
      publish: vi.fn(),
      readReplayFromByteOffset: vi.fn(async () => ({
        nextByteOffset: 0,
        records: [],
      })),
      readReplayTailLines: vi.fn(async () => []),
      subscribe: hubSubscribe,
    };
    const resolved = applyNestjsLoggingModuleDefaults({
      logDirectory,
      websocket: {
        enabled: true,
        maxPendingRecordsPerSocket: 2,
      },
    });
    const gateway = await compileGateway(hub, resolved);
    const { client, emit } = createMockSocket();

    gateway.handleConnection(client);
    gateway.onLogsSubscribe(client, {});

    const listener = hubSubscribe.mock.calls[0]?.[0];

    if (listener === undefined) {
      throw new Error('expected hub listener');
    }

    for (let i = 0; i < 5; i += 1) {
      listener(hubRecord(`m${i}`));
    }

    await Promise.resolve();

    const noticeCalls = emit.mock.calls.filter(
      (call) => call[0] === 'log.notice',
    );

    expect(noticeCalls.length).toBeGreaterThan(0);
    expect(noticeCalls[0]?.[1]).toMatchObject({ type: 'backpressure' });
  });
});
