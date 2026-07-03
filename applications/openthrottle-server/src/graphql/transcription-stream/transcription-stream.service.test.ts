import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TranscriptionStreamService } from './transcription-stream.service';

/**
 * Minimal WhisperLive-shaped websocket double: records sent frames and lets
 * tests drive open/message/close events synchronously.
 */
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  binaryType = 'blob';
  readonly listeners = new Map<string, Array<(event: unknown) => void>>();
  readonly sent: unknown[] = [];
  close = vi.fn();

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    const existing = this.listeners.get(type) ?? [];
    this.listeners.set(type, [...existing, listener]);
  }

  emit(type: string, event: unknown): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  send(data: unknown): void {
    this.sent.push(data);
  }

  /** Complete the connect handshake: open + SERVER_READY. */
  becomeReady(): void {
    this.emit('open', {});
    this.emit('message', {
      data: JSON.stringify({
        backend: 'faster_whisper',
        message: 'SERVER_READY',
      }),
    });
  }

  segments(
    segments: ReadonlyArray<{
      completed?: boolean;
      end: string;
      start: string;
      text: string;
    }>,
  ): void {
    this.emit('message', { data: JSON.stringify({ segments, uid: 'x' }) });
  }
}

const encodeInt16 = (samples: ReadonlyArray<number>): string => {
  const pcm = new Int16Array(samples);
  return Buffer.from(pcm.buffer).toString('base64');
};

function buildService(): {
  publish: ReturnType<typeof vi.fn>;
  service: TranscriptionStreamService;
} {
  const publish = vi.fn().mockResolvedValue(undefined);
  const service = new TranscriptionStreamService(createMock<LoggerService>(), {
    asyncIterator: vi.fn(),
    publish,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  });
  return { publish, service };
}

/** Start a session and complete the Whisper handshake. */
async function startReadySession(
  service: TranscriptionStreamService,
  userId = 'user-1',
): Promise<{ sessionId: string; socket: MockWebSocket }> {
  const pending = service.start(userId);
  const socket = MockWebSocket.instances.at(-1);
  if (!socket) {
    throw new Error('no socket created');
  }
  socket.becomeReady();
  const started = await pending;
  if (started.sessionId == null) {
    throw new Error(`start failed: ${started.errorMessage}`);
  }
  return { sessionId: started.sessionId, socket };
}

const publishedChunks = (
  publish: ReturnType<typeof vi.fn>,
): Array<Record<string, unknown>> =>
  publish.mock.calls.map(
    ([, payload]) => payload.transcriptionStreamChunkAdded,
  );

beforeEach(() => {
  vi.useFakeTimers();
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  vi.stubEnv('WHISPER_MODEL', 'base.en');
  vi.stubEnv('WHISPER_SERVICE_URL', 'ws://localhost:6030');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('TranscriptionStreamService', () => {
  it('fails start with an errorMessage when WHISPER_SERVICE_URL is unset', async () => {
    vi.stubEnv('WHISPER_SERVICE_URL', '');
    const { service } = buildService();

    const result = await service.start('user-1');

    expect(result.sessionId).toBeNull();
    expect(result.errorMessage).toContain('WHISPER_SERVICE_URL');
  });

  it('connects, handshakes with the env model, and resolves a session id', async () => {
    const { service } = buildService();

    const { sessionId, socket } = await startReadySession(service);

    expect(sessionId).toEqual(expect.any(String));
    expect(socket.url).toBe('ws://localhost:6030');
    const handshake = JSON.parse(socket.sent[0] as string);
    expect(handshake).toMatchObject({
      language: 'en',
      model: 'base.en',
      task: 'transcribe',
      uid: sessionId,
    });
  });

  it('fails start with an errorMessage when the socket errors before ready', async () => {
    const { service } = buildService();

    const pending = service.start('user-1');
    MockWebSocket.instances.at(-1)?.emit('error', {});
    const result = await pending;

    expect(result.sessionId).toBeNull();
    expect(result.errorMessage).toContain('unreachable');
  });

  it('decodes base64 Int16 audio to Float32 and relays it upstream', async () => {
    const { service } = buildService();
    const { sessionId, socket } = await startReadySession(service);

    const accepted = service.sendAudioChunk(
      'user-1',
      sessionId,
      encodeInt16([16384, -32768]),
    );

    expect(accepted).toBe(true);
    const relayed = socket.sent.at(-1) as Float32Array;
    expect(relayed).toBeInstanceOf(Float32Array);
    expect(Array.from(relayed)).toEqual([0.5, -1]);
  });

  it('rejects audio for a session owned by another user', async () => {
    const { service } = buildService();
    const { sessionId } = await startReadySession(service);

    expect(
      service.sendAudioChunk('intruder', sessionId, encodeInt16([1])),
    ).toBe(false);
    expect(service.ownsSession('intruder', sessionId)).toBe(false);
    expect(service.ownsSession('user-1', sessionId)).toBe(true);
  });

  it('publishes snapshot-replace chunks: completed segments accumulate, the tail revises', async () => {
    const { publish, service } = buildService();
    const { socket } = await startReadySession(service);

    socket.segments([{ end: '1.0', start: '0.0', text: ' Hello' }]);
    socket.segments([
      { completed: true, end: '1.2', start: '0.0', text: ' Hello world.' },
      { end: '2.0', start: '1.2', text: ' this is a te' },
    ]);
    socket.segments([
      { completed: true, end: '1.2', start: '0.0', text: ' Hello world.' },
      { end: '2.4', start: '1.2', text: ' this is a test' },
    ]);

    const chunks = publishedChunks(publish);
    expect(chunks.map((chunk) => chunk.transcript)).toEqual([
      ' Hello',
      ' Hello world. this is a te',
      ' Hello world. this is a test',
    ]);
    expect(chunks.map((chunk) => chunk.sortOrder)).toEqual([0, 1, 2]);
    expect(chunks.every((chunk) => chunk.done === false)).toBe(true);
  });

  it('stop sends binary END_OF_AUDIO and publishes the terminal done chunk after the flush window', async () => {
    const { publish, service } = buildService();
    const { sessionId, socket } = await startReadySession(service);
    socket.segments([
      { completed: true, end: '1.0', start: '0.0', text: ' Hi.' },
    ]);

    expect(service.stop('user-1', sessionId)).toBe(true);

    const eof = socket.sent.at(-1) as Uint8Array;
    expect(eof).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(eof).toString()).toBe('END_OF_AUDIO');

    vi.advanceTimersByTime(2_000);

    const last = publishedChunks(publish).at(-1);
    expect(last).toMatchObject({
      done: true,
      error: null,
      sessionId,
      transcript: ' Hi.',
    });
    expect(service.ownsSession('user-1', sessionId)).toBe(false);
  });

  it('reaps an idle session with a terminal error chunk after ~15s without audio', async () => {
    const { publish, service } = buildService();
    const { sessionId } = await startReadySession(service);

    vi.advanceTimersByTime(15_000);

    const last = publishedChunks(publish).at(-1);
    expect(last).toMatchObject({ done: true, sessionId });
    expect(String(last?.error)).toContain('reaped');
    expect(service.ownsSession('user-1', sessionId)).toBe(false);
  });

  it('enforces one active session per user: a new start finalizes the previous', async () => {
    const { publish, service } = buildService();
    const { sessionId: first } = await startReadySession(service);

    const { sessionId: second } = await startReadySession(service);

    expect(second).not.toBe(first);
    const firstTerminal = publishedChunks(publish).find(
      (chunk) => chunk.sessionId === first && chunk.done === true,
    );
    expect(String(firstTerminal?.error)).toContain('Replaced');
    expect(service.ownsSession('user-1', first)).toBe(false);
    expect(service.ownsSession('user-1', second)).toBe(true);
  });

  it('finalizes with an error chunk when the upstream socket closes mid-session', async () => {
    const { publish, service } = buildService();
    const { sessionId, socket } = await startReadySession(service);

    socket.emit('close', {});

    const last = publishedChunks(publish).at(-1);
    expect(last).toMatchObject({ done: true, sessionId });
    expect(String(last?.error)).toContain('closed');
  });

  it('publishes on the transcription:<sessionId>:stream topic with the resolver field name', async () => {
    const { publish, service } = buildService();
    const { sessionId, socket } = await startReadySession(service);

    socket.segments([{ end: '0.5', start: '0.0', text: ' x' }]);

    expect(publish).toHaveBeenCalledWith(
      `transcription:${sessionId}:stream`,
      expect.objectContaining({
        transcriptionStreamChunkAdded: expect.any(Object),
      }),
    );
  });
});
