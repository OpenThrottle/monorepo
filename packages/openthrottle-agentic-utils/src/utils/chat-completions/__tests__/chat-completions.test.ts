import { afterEach, describe, expect, it, vi } from 'vitest';

import { streamChatCompletion } from '../stream.ts';

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock('openai', () => ({
  default: vi.fn(function OpenAIMock() {
    return { chat: { completions: { create: createMock } } };
  }),
}));

/** Build a fake SDK stream that yields one chunk per delta string. */
async function* fakeStream(
  deltas: ReadonlyArray<string>,
): AsyncGenerator<{ choices: Array<{ delta: { content: string | null } }> }> {
  for (const content of deltas) {
    yield { choices: [{ delta: { content } }] };
  }
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  delete process.env.OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS;
});

describe('streamChatCompletion', () => {
  it('yields each non-empty delta followed by a terminal done chunk', async () => {
    createMock.mockResolvedValue(fakeStream(['Hel', 'lo', '', ' world']));

    const chunks = [];
    for await (const chunk of streamChatCompletion({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { delta: 'Hel', done: false },
      { delta: 'lo', done: false },
      { delta: ' world', done: false },
      { delta: '', done: true },
    ]);
  });

  it('forwards model, mapped messages, and an abort signal to the SDK', async () => {
    createMock.mockResolvedValue(fakeStream(['ok']));
    const controller = new AbortController();

    const iterator = streamChatCompletion({
      baseUrl: 'http://localhost:1234/v1',
      messages: [
        { content: 'be terse', role: 'system' },
        { content: 'ping', role: 'user' },
      ],
      model: 'qwen',
      signal: controller.signal,
    })[Symbol.asyncIterator]();
    await iterator.next();

    // The caller signal is no longer forwarded verbatim — it is composed with
    // the internal idle-timeout controller (see the idle-timeout test) — so we
    // assert the request payload exactly and that *an* AbortSignal is passed.
    expect(createMock).toHaveBeenCalledWith(
      {
        messages: [
          { content: 'be terse', role: 'system' },
          { content: 'ping', role: 'user' },
        ],
        model: 'qwen',
        stream: true,
      },
      { signal: expect.any(AbortSignal) },
    );
  });

  it('propagates SDK errors to the consumer', async () => {
    createMock.mockRejectedValue(new Error('connection refused'));

    await expect(async () => {
      for await (const _chunk of streamChatCompletion({
        baseUrl: 'http://localhost:9999/v1',
        messages: [{ content: 'hi', role: 'user' }],
        model: 'gone',
      })) {
        void _chunk;
      }
    }).rejects.toThrow('connection refused');
  });

  it('aborts a silent stream on idle and surfaces a clear timeout error', async () => {
    vi.useFakeTimers();
    process.env.OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS = '5000';

    // A stream that yields nothing and only settles (rejecting) when the
    // request signal aborts — i.e. it hangs until the idle timeout fires.
    createMock.mockImplementation(
      (_request: unknown, options: { signal?: AbortSignal }) => {
        const signal = options.signal;
        async function* silent(): AsyncGenerator<{
          choices: Array<{ delta: { content: string } }>;
        }> {
          await new Promise<never>((_resolve, reject) => {
            signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          });
          yield { choices: [{ delta: { content: 'never' } }] };
        }
        return Promise.resolve(silent());
      },
    );

    const drain = (async (): Promise<void> => {
      for await (const _chunk of streamChatCompletion({
        baseUrl: 'http://localhost:11434/v1',
        messages: [{ content: 'hi', role: 'user' }],
        model: 'llama3',
      })) {
        void _chunk;
      }
    })();
    // Surface the rejection to vitest without an unhandled rejection while we
    // advance the fake idle timer.
    const assertion = expect(drain).rejects.toThrow(/stalled/);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it('propagates a mid-stream abort error', async () => {
    async function* aborting(): AsyncGenerator<{
      choices: Array<{ delta: { content: string } }>;
    }> {
      yield { choices: [{ delta: { content: 'partial' } }] };
      throw new DOMException('aborted', 'AbortError');
    }
    createMock.mockResolvedValue(aborting());

    const seen: Array<string> = [];
    await expect(async () => {
      for await (const chunk of streamChatCompletion({
        baseUrl: 'http://localhost:11434/v1',
        messages: [{ content: 'hi', role: 'user' }],
        model: 'llama3',
      })) {
        seen.push(chunk.delta);
      }
    }).rejects.toThrow('aborted');
    expect(seen).toEqual(['partial']);
  });
});
