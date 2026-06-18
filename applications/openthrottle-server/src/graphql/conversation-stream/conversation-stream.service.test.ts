import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { AgentConversationsService } from '@openthrottle/nestjs-repositories';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ConversationStreamService,
  type StartConversationStreamRun,
} from './conversation-stream.service';

const { streamChatCompletionMock } = vi.hoisted(() => ({
  streamChatCompletionMock: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', () => ({
  streamChatCompletion: streamChatCompletionMock,
}));

/** Build a fake agentic-utils stream yielding the given deltas + a terminal done. */
async function* fakeStream(
  deltas: ReadonlyArray<string>,
): AsyncGenerator<{ delta: string; done: boolean }> {
  for (const delta of deltas) {
    yield { delta, done: false };
  }
  yield { delta: '', done: true };
}

const baseRun: StartConversationStreamRun = {
  assistantMessageId: 'assistant-msg-1',
  baseUrl: 'http://localhost:11434/v1',
  conversationId: 'conv-1',
  messages: [{ content: 'hi', role: 'user' }],
  model: 'llama3',
  provider: 'ollama',
  userId: 'user-1',
};

function buildService(): {
  conversations: AgentConversationsService;
  publish: ReturnType<typeof vi.fn>;
  service: ConversationStreamService;
} {
  const conversations = createMock<AgentConversationsService>({
    appendMessages: vi.fn().mockResolvedValue([]),
    updateModelSnapshot: vi.fn().mockResolvedValue(undefined),
  });
  const publish = vi.fn().mockResolvedValue(undefined);
  const service = new ConversationStreamService(
    conversations,
    createMock<LoggerService>(),
    {
      asyncIterator: vi.fn(),
      publish,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
  );
  return { conversations, publish, service };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ConversationStreamService', () => {
  it('publishes each delta then a terminal done chunk and persists the assistant message', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['Hel', 'lo']));
    const { conversations, publish, service } = buildService();

    await service.runStream(baseRun);

    const published = publish.mock.calls.map(
      ([, payload]) => payload.conversationStreamChunkAdded,
    );
    expect(published).toEqual([
      expect.objectContaining({ delta: 'Hel', done: false, sortOrder: 0 }),
      expect.objectContaining({ delta: 'lo', done: false, sortOrder: 1 }),
      expect.objectContaining({
        delta: '',
        done: true,
        error: null,
        sortOrder: 2,
      }),
    ]);
    expect(conversations.appendMessages).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
      [{ content: 'Hello', id: 'assistant-msg-1', role: 'assistant' }],
    );
    expect(conversations.updateModelSnapshot).toHaveBeenCalledWith('conv-1', {
      modelName: 'llama3',
      modelProvider: 'ollama',
    });
  });

  it('publishes the topic keyed by conversation id with the resolver field name', async () => {
    streamChatCompletionMock.mockReturnValue(fakeStream(['x']));
    const { publish, service } = buildService();

    await service.runStream(baseRun);

    expect(publish).toHaveBeenCalledWith(
      'conversation:conv-1:stream',
      expect.objectContaining({
        conversationStreamChunkAdded: expect.any(Object),
      }),
    );
  });

  it('emits a terminal error chunk and persists the partial text on stream failure', async () => {
    async function* failing(): AsyncGenerator<{
      delta: string;
      done: boolean;
    }> {
      yield { delta: 'partial', done: false };
      throw new Error('connection reset');
    }
    streamChatCompletionMock.mockReturnValue(failing());
    const { conversations, publish, service } = buildService();

    await service.runStream(baseRun);

    const last = publish.mock.calls.at(-1)?.[1].conversationStreamChunkAdded;
    expect(last).toMatchObject({ done: true, error: 'connection reset' });
    expect(conversations.appendMessages).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
      [{ content: 'partial', id: 'assistant-msg-1', role: 'assistant' }],
    );
  });

  it('cancel aborts an in-flight stream', async () => {
    let abortObserved = false;
    async function* abortable(
      _input: unknown,
    ): AsyncGenerator<{ delta: string; done: boolean }> {
      yield { delta: 'first', done: false };
      // simulate the SDK observing the abort on the next pull
      abortObserved = true;
      throw new DOMException('aborted', 'AbortError');
    }
    streamChatCompletionMock.mockImplementation(abortable);
    const { publish, service } = buildService();

    const done = service.runStream(baseRun);
    service.cancel('conv-1');
    await done;

    expect(abortObserved).toBe(true);
    const last = publish.mock.calls.at(-1)?.[1].conversationStreamChunkAdded;
    expect(last).toMatchObject({ done: true });
  });
});
