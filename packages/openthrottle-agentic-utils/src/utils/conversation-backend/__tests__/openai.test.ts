import { afterEach, describe, expect, it, vi } from 'vitest';

import { openAiConversationBackend } from '../openai.ts';

const { streamChatCompletionMock } = vi.hoisted(() => ({
  streamChatCompletionMock: vi.fn(),
}));

vi.mock('../../chat-completions/index.js', () => ({
  streamChatCompletion: streamChatCompletionMock,
}));

/** Fake underlying OpenAI stream: deltas then a terminal done. */
async function* fakeStream(
  deltas: ReadonlyArray<string>,
): AsyncGenerator<{ delta: string; done: boolean }> {
  for (const delta of deltas) {
    yield { delta, done: false };
  }
  yield { delta: '', done: true };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('openAiConversationBackend', () => {
  it('maps each underlying chunk to a text-kind chunk, preserving delta/done', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['Hel', 'lo']));

    const chunks = [];
    for await (const chunk of openAiConversationBackend.stream({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { delta: 'Hel', done: false, kind: 'text' },
      { delta: 'lo', done: false, kind: 'text' },
      { delta: '', done: true, kind: 'text' },
    ]);
  });

  it('forwards baseUrl, messages, model, and signal to streamChatCompletion', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['ok']));
    const controller = new AbortController();

    const stream = openAiConversationBackend.stream({
      baseUrl: 'http://localhost:1234/v1',
      messages: [{ content: 'ping', role: 'user' }],
      model: 'qwen',
      signal: controller.signal,
    });
    await stream[Symbol.asyncIterator]().next();

    expect(streamChatCompletionMock).toHaveBeenCalledWith({
      baseUrl: 'http://localhost:1234/v1',
      messages: [{ content: 'ping', role: 'user' }],
      model: 'qwen',
      signal: controller.signal,
    });
  });

  it('maps the composer reasoning level to the OpenAI reasoning_effort triple (ceiling = high)', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['ok']));

    const stream = openAiConversationBackend.stream({
      baseUrl: 'http://localhost:1234/v1',
      messages: [{ content: 'ping', role: 'user' }],
      model: 'gpt-oss',
      reasoning: 'ultra',
    });
    await stream[Symbol.asyncIterator]().next();

    expect(streamChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({ reasoningEffort: 'high' }),
    );
  });

  it('omits reasoningEffort when no reasoning level is selected', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['ok']));

    const stream = openAiConversationBackend.stream({
      baseUrl: 'http://localhost:1234/v1',
      messages: [{ content: 'ping', role: 'user' }],
      model: 'llama3',
    });
    await stream[Symbol.asyncIterator]().next();

    expect(streamChatCompletionMock.mock.calls[0]?.[0].reasoningEffort).toBe(
      undefined,
    );
  });

  it('injects @-mentioned paths as a leading system message (openai has no file tools)', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['ok']));

    const stream = openAiConversationBackend.stream({
      baseUrl: 'http://localhost:1234/v1',
      fileMentions: ['src/app.ts'],
      messages: [{ content: 'check it', role: 'user' }],
      model: 'llama3',
    });
    await stream[Symbol.asyncIterator]().next();

    const forwarded = streamChatCompletionMock.mock.calls[0]?.[0].messages;
    expect(forwarded[0].role).toBe('system');
    expect(forwarded[0].content).toContain('- src/app.ts');
    expect(forwarded[1]).toEqual({ content: 'check it', role: 'user' });
  });

  it('forwards an authenticated gateway apiKey and headers to streamChatCompletion', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['ok']));

    const stream = openAiConversationBackend.stream({
      apiKey: 'sk-or-v1-test',
      baseUrl: 'https://openrouter.ai/api/v1',
      headers: { 'X-OpenRouter-Title': 'OpenThrottle' },
      messages: [{ content: 'ping', role: 'user' }],
      model: 'anthropic/claude-sonnet-5',
    });
    await stream[Symbol.asyncIterator]().next();

    expect(streamChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'sk-or-v1-test',
        headers: { 'X-OpenRouter-Title': 'OpenThrottle' },
      }),
    );
  });

  it('leaves apiKey and headers undefined for an unauthenticated local endpoint', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['ok']));

    const stream = openAiConversationBackend.stream({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'ping', role: 'user' }],
      model: 'llama3',
    });
    await stream[Symbol.asyncIterator]().next();

    const forwarded = streamChatCompletionMock.mock.calls[0]?.[0];
    expect(forwarded.apiKey).toBe(undefined);
    expect(forwarded.headers).toBe(undefined);
  });

  it('maps terminal usage onto the chunk metadata the server persists', async () => {
    const usage = { completion_tokens: 8, cost: 0.0001, prompt_tokens: 4 };
    async function* withUsage(): AsyncGenerator<{
      delta: string;
      done: boolean;
      usage?: Record<string, unknown>;
    }> {
      yield { delta: 'ok', done: false };
      yield { delta: '', done: true, usage };
    }
    streamChatCompletionMock.mockReturnValue(withUsage());

    const chunks = [];
    for await (const chunk of openAiConversationBackend.stream({
      baseUrl: 'https://openrouter.ai/api/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'anthropic/claude-sonnet-5',
    })) {
      chunks.push(chunk);
    }

    // Same terminal-metadata shape claude and cursor-agent use, so the server
    // re-emits it as a discrete usage chunk with no special-casing.
    expect(chunks.at(-1)).toEqual({
      delta: '',
      done: true,
      kind: 'text',
      metadata: { usage },
    });
  });

  it('attaches no metadata when the provider reported no usage', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['ok']));

    const chunks = [];
    for await (const chunk of openAiConversationBackend.stream({
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    })) {
      chunks.push(chunk);
    }

    expect(chunks.at(-1)).toEqual({ delta: '', done: true, kind: 'text' });
  });

  it('throws when baseUrl is missing rather than calling the SDK', async () => {
    await expect(async () => {
      for await (const _chunk of openAiConversationBackend.stream({
        messages: [{ content: 'hi', role: 'user' }],
        model: 'llama3',
      })) {
        void _chunk;
      }
    }).rejects.toThrow('requires a baseUrl');
    expect(streamChatCompletionMock).not.toHaveBeenCalled();
  });
});
