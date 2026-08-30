import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ChatCompletionMessage,
  StreamChatCompletionOptions,
} from '../stream.ts';
import { streamChatCompletion } from '../stream.ts';

const { constructMock, createMock } = vi.hoisted(() => ({
  constructMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock('openai', () => ({
  default: vi.fn(function OpenAIMock(clientOptions: unknown) {
    constructMock(clientOptions);
    return { chat: { completions: { create: createMock } } };
  }),
}));

/** The options the SDK client was constructed with on the latest call. */
function clientOptions(): Record<string, unknown> {
  const call: unknown = constructMock.mock.calls.at(-1)?.[0];
  if (typeof call !== 'object' || call === null) {
    throw new Error(
      'OpenAI client was not constructed with an options object.',
    );
  }
  return { ...call };
}

/** Drive one turn far enough that the client is constructed. */
async function startTurn(
  options: Parameters<typeof streamChatCompletion>[0],
): Promise<void> {
  createMock.mockResolvedValue(fakeStream(['ok']));
  const iterator = streamChatCompletion(options)[Symbol.asyncIterator]();
  await iterator.next();
}

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
  delete process.env.LLM_API_KEY;
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

describe('streamChatCompletion authentication', () => {
  it('falls back to LLM_API_KEY when no apiKey is supplied', async () => {
    process.env.LLM_API_KEY = 'env-key';

    await startTurn({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    });

    expect(clientOptions()).toMatchObject({ apiKey: 'env-key' });
  });

  it("falls back to 'not-needed' when neither an apiKey nor LLM_API_KEY is set", async () => {
    delete process.env.LLM_API_KEY;

    await startTurn({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    });

    expect(clientOptions()).toMatchObject({ apiKey: 'not-needed' });
  });

  it('prefers a supplied apiKey over the env fallback', async () => {
    process.env.LLM_API_KEY = 'env-key';

    await startTurn({
      apiKey: 'sk-or-v1-supplied',
      baseUrl: 'https://openrouter.ai/api/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'anthropic/claude-sonnet-5',
    });

    expect(clientOptions()).toMatchObject({
      apiKey: 'sk-or-v1-supplied',
      baseURL: 'https://openrouter.ai/api/v1',
    });
  });

  it('passes supplied headers to the client as defaultHeaders', async () => {
    await startTurn({
      apiKey: 'sk-or-v1-supplied',
      baseUrl: 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': 'https://openthrottle.ai',
        'X-OpenRouter-Title': 'OpenThrottle',
      },
      messages: [{ content: 'hi', role: 'user' }],
      model: 'anthropic/claude-sonnet-5',
    });

    expect(clientOptions()).toMatchObject({
      defaultHeaders: {
        'HTTP-Referer': 'https://openthrottle.ai',
        'X-OpenRouter-Title': 'OpenThrottle',
      },
    });
  });

  it('sets no defaultHeaders at all when headers are omitted', async () => {
    await startTurn({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    });

    expect(clientOptions()).not.toHaveProperty('defaultHeaders');
  });
});

describe('streamChatCompletion usage', () => {
  /** A fake SDK stream whose LAST part carries the usage block. */
  async function* streamWithUsage(
    usage: unknown,
  ): AsyncGenerator<Record<string, unknown>> {
    yield { choices: [{ delta: { content: 'hi' } }] };
    yield { choices: [{ delta: { content: null } }], usage };
  }

  it('rides the terminal usage payload on the done chunk', async () => {
    const usage = {
      completion_tokens: 214,
      cost: 0.00431,
      prompt_tokens: 1290,
      total_tokens: 1504,
    };
    createMock.mockResolvedValue(streamWithUsage(usage));

    const chunks = [];
    for await (const chunk of streamChatCompletion({
      baseUrl: 'https://openrouter.ai/api/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'anthropic/claude-sonnet-5',
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { delta: 'hi', done: false },
      { delta: '', done: true, usage },
    ]);
  });

  it('sends no usage/stream_options request param (OpenRouter deprecated both)', async () => {
    createMock.mockResolvedValue(fakeStream(['ok']));

    const iterator = streamChatCompletion({
      baseUrl: 'https://openrouter.ai/api/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'anthropic/claude-sonnet-5',
    })[Symbol.asyncIterator]();
    await iterator.next();

    // Sending an unknown param would also risk rejection from the LOCAL
    // endpoints that share this exact code path.
    const body: unknown = createMock.mock.calls[0]?.[0];
    expect(body).not.toHaveProperty('stream_options');
    expect(body).not.toHaveProperty('usage');
  });

  it('omits usage entirely when the provider reports none', async () => {
    createMock.mockResolvedValue(fakeStream(['ok']));

    const chunks = [];
    for await (const chunk of streamChatCompletion({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    })) {
      chunks.push(chunk);
    }

    // Local servers usually report nothing — absence is silent, not an error.
    expect(chunks.at(-1)).toEqual({ delta: '', done: true });
  });

  it('ignores a malformed usage payload rather than forwarding it', async () => {
    createMock.mockResolvedValue(streamWithUsage('not-an-object'));

    const chunks = [];
    for await (const chunk of streamChatCompletion({
      baseUrl: 'https://openrouter.ai/api/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'anthropic/claude-sonnet-5',
    })) {
      chunks.push(chunk);
    }

    expect(chunks.at(-1)).toEqual({ delta: '', done: true });
  });
});
