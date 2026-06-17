import { afterEach, describe, expect, it, vi } from 'vitest';

import { streamChatCompletion } from '../stream.js';

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

  it('forwards model, mapped messages, and the abort signal to the SDK', async () => {
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

    expect(createMock).toHaveBeenCalledWith(
      {
        messages: [
          { content: 'be terse', role: 'system' },
          { content: 'ping', role: 'user' },
        ],
        model: 'qwen',
        stream: true,
      },
      { signal: controller.signal },
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
