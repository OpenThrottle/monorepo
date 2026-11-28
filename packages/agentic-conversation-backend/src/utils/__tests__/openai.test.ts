import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { openAiConversationBackend } from '../openai.ts';

const { streamChatCompletionMock } = vi.hoisted(() => ({
  streamChatCompletionMock: vi.fn(),
}));

vi.mock('../streamChatCompletion.ts', () => ({
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

  it('attaches the turn images as data URLs to the latest user message only', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['ok']));
    const directory = await mkdtemp(join(tmpdir(), 'ot-openai-images-'));
    try {
      const path = join(directory, 'pic.png');
      await writeFile(path, Buffer.from('png-bytes'));

      const stream = openAiConversationBackend.stream({
        attachments: [{ mimeType: 'image/png', path, sha256: 'a'.repeat(64) }],
        baseUrl: 'http://localhost:11434/v1',
        messages: [
          { content: 'first', role: 'user' },
          { content: 'answer', role: 'assistant' },
          { content: 'look at this', role: 'user' },
        ],
        model: 'llava',
      });
      await stream[Symbol.asyncIterator]().next();

      const expectedUrl = `data:image/png;base64,${Buffer.from('png-bytes').toString('base64')}`;
      expect(streamChatCompletionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { content: 'first', role: 'user' },
            { content: 'answer', role: 'assistant' },
            { content: 'look at this', images: [expectedUrl], role: 'user' },
          ],
        }),
      );
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it('leaves messages untouched when there are no attachments', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['ok']));

    const stream = openAiConversationBackend.stream({
      attachments: [],
      baseUrl: 'http://localhost:11434/v1',
      messages: [{ content: 'hi', role: 'user' }],
      model: 'llama3',
    });
    await stream[Symbol.asyncIterator]().next();

    expect(streamChatCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ content: 'hi', role: 'user' }],
      }),
    );
  });
});
