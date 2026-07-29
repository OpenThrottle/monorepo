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
