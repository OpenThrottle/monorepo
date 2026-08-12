import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ChatCompletionMessage,
  StreamChatCompletionOptions,
} from '../stream.ts';
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

async function collect(
  options: StreamChatCompletionOptions,
): Promise<Array<{ delta: string; done: boolean }>> {
  const chunks: Array<{ delta: string; done: boolean }> = [];
  for await (const chunk of streamChatCompletion(options)) {
    chunks.push(chunk);
  }
  return chunks;
}

describe('streamChatCompletion', () => {
  it('yields each non-empty delta followed by a terminal done chunk', async () => {
    createMock.mockResolvedValue(fakeStream(['Hel', 'lo', '', ' world']));

    const chunks = await collect({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    });

    expect(chunks).toEqual([
      { delta: 'Hel', done: false },
      { delta: 'lo', done: false },
      { delta: ' world', done: false },
      { delta: '', done: true },
    ]);
  });

  it('yields only the terminal chunk when the SDK stream produces no content', async () => {
    createMock.mockResolvedValue(fakeStream([]));

    const chunks = await collect({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    });

    expect(chunks).toEqual([{ delta: '', done: true }]);
  });

  it('maps every message role to the matching SDK param', async () => {
    createMock.mockResolvedValue(fakeStream(['ok']));

    const messages: ChatCompletionMessage[] = [
      { content: 'be terse', role: 'system' },
      { content: 'prior answer', role: 'assistant' },
      { content: 'ping', role: 'user' },
    ];
    await collect({
      baseUrl: 'http://localhost:1234/v1',
      messages,
      model: 'qwen',
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { content: 'be terse', role: 'system' },
          { content: 'prior answer', role: 'assistant' },
          { content: 'ping', role: 'user' },
        ],
      }),
      expect.anything(),
    );
  });

  it('only forwards reasoning_effort when the caller set it', async () => {
    createMock.mockResolvedValue(fakeStream(['ok']));

    await collect({
      baseUrl: 'http://localhost:1234/v1',
      messages: [{ content: 'ping', role: 'user' }],
      model: 'qwen',
    });

    expect(createMock).toHaveBeenCalledWith(
      {
        messages: [{ content: 'ping', role: 'user' }],
        model: 'qwen',
        stream: true,
      },
      { signal: expect.any(AbortSignal) },
    );

    createMock.mockClear();
    createMock.mockResolvedValue(fakeStream(['ok']));
    await collect({
      baseUrl: 'http://localhost:1234/v1',
      messages: [{ content: 'ping', role: 'user' }],
      model: 'qwen',
      reasoningEffort: 'high',
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ reasoning_effort: 'high' }),
      expect.anything(),
    );
  });

  it('forwards an abort signal composed with the internal idle controller', async () => {
    createMock.mockResolvedValue(fakeStream(['ok']));
    const controller = new AbortController();

    await collect({
      baseUrl: 'http://localhost:1234/v1',
      messages: [{ content: 'ping', role: 'user' }],
      model: 'qwen',
      signal: controller.signal,
    });

    expect(createMock).toHaveBeenCalledWith(expect.anything(), {
      signal: expect.any(AbortSignal),
    });
  });

  it('propagates SDK errors to the consumer', async () => {
    createMock.mockRejectedValue(new Error('connection refused'));

    await expect(
      collect({
        baseUrl: 'http://localhost:9999/v1',
        messages: [{ content: 'hi', role: 'user' }],
        model: 'gone',
      }),
    ).rejects.toThrow('connection refused');
  });

  it('propagates a mid-stream error after already-yielded deltas', async () => {
    async function* aborting(): AsyncGenerator<{
      choices: Array<{ delta: { content: string } }>;
    }> {
      yield { choices: [{ delta: { content: 'partial' } }] };
      throw new DOMException('aborted', 'AbortError');
    }
    createMock.mockResolvedValue(aborting());

    const seen: string[] = [];
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

  it('aborts a silent stream on idle and surfaces a clear timeout error', async () => {
    vi.useFakeTimers();
    process.env.OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS = '5000';

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

    const drain = collect({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    });
    const assertion = expect(drain).rejects.toThrow(/stalled/);
    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it('does not surface the stall message when the caller itself aborted', async () => {
    const controller = new AbortController();
    createMock.mockImplementation(
      (_request: unknown, options: { signal?: AbortSignal }) => {
        async function* rejecting(): AsyncGenerator<{
          choices: Array<{ delta: { content: string } }>;
        }> {
          await new Promise<never>((_resolve, reject) => {
            options.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          });
          yield { choices: [{ delta: { content: 'never' } }] };
        }
        return Promise.resolve(rejecting());
      },
    );

    const drain = collect({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
      signal: controller.signal,
    });
    // Let the generator reach its `await ... addEventListener('abort', ...)`
    // before aborting, so the listener is registered in time to catch it.
    await new Promise((resolve) => setTimeout(resolve, 0));
    controller.abort();

    await expect(drain).rejects.toThrow('aborted');
  });
});
