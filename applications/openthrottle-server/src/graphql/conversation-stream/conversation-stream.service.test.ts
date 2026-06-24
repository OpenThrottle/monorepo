import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { AgentConversationsService } from '@openthrottle/nestjs-repositories';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ConversationStreamService,
  type StartConversationStreamRun,
} from './conversation-stream.service';

const { openAiStreamMock } = vi.hoisted(() => ({
  openAiStreamMock: vi.fn(),
}));

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@openthrottle/openthrottle-agentic-utils')
  >()),
  openAiConversationBackend: { stream: openAiStreamMock },
}));

/** Build a fake backend stream yielding the given text deltas + a terminal done. */
async function* fakeStream(
  deltas: ReadonlyArray<string>,
): AsyncGenerator<{ delta: string; done: boolean; kind: string }> {
  for (const delta of deltas) {
    yield { delta, done: false, kind: 'text' };
  }
  yield { delta: '', done: true, kind: 'text' };
}

const baseRun: StartConversationStreamRun = {
  assistantMessageId: 'assistant-msg-1',
  backend: 'openai',
  baseUrl: 'http://localhost:11434/v1',
  conversationId: 'conv-1',
  cwd: null,
  messages: [{ content: 'hi', role: 'user' }],
  model: 'llama3',
  provider: 'ollama',
  sessionId: null,
  systemPrompt: null,
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
    openAiStreamMock.mockReturnValue(fakeStream(['Hel', 'lo']));
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
      [
        {
          content: 'Hello',
          id: 'assistant-msg-1',
          role: 'assistant',
          toolMetadata: null,
        },
      ],
    );
    expect(conversations.updateModelSnapshot).toHaveBeenCalledWith('conv-1', {
      modelName: 'llama3',
      modelProvider: 'ollama',
    });
  });

  it('persists non-text events (thinking/tool) to the assistant message tool_metadata', async () => {
    async function* mixed(): AsyncGenerator<{
      delta: string;
      done: boolean;
      kind: string;
      metadata?: Record<string, unknown>;
    }> {
      yield { delta: 'reasoning…', done: false, kind: 'thinking' };
      yield {
        delta: '',
        done: false,
        kind: 'tool_call',
        metadata: { callId: 'c1' },
      };
      yield { delta: 'Answer', done: false, kind: 'text' };
      yield { delta: '', done: true, kind: 'text' };
    }
    openAiStreamMock.mockReturnValue(mixed());
    const { conversations, service } = buildService();

    await service.runStream(baseRun);

    expect(conversations.appendMessages).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
      [
        expect.objectContaining({
          content: 'Answer',
          toolMetadata: {
            events: [
              { delta: 'reasoning…', kind: 'thinking', metadata: null },
              { delta: '', kind: 'tool_call', metadata: { callId: 'c1' } },
            ],
          },
        }),
      ],
    );
  });

  it('publishes the topic keyed by conversation id with the resolver field name', async () => {
    openAiStreamMock.mockReturnValue(fakeStream(['x']));
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
      kind: string;
    }> {
      yield { delta: 'partial', done: false, kind: 'text' };
      throw new Error('connection reset');
    }
    openAiStreamMock.mockReturnValue(failing());
    const { conversations, publish, service } = buildService();

    await service.runStream(baseRun);

    const last = publish.mock.calls.at(-1)?.[1].conversationStreamChunkAdded;
    expect(last).toMatchObject({ done: true, error: 'connection reset' });
    expect(conversations.appendMessages).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
      [
        {
          content: 'partial',
          id: 'assistant-msg-1',
          role: 'assistant',
          toolMetadata: null,
        },
      ],
    );
  });

  it('cancel aborts an in-flight stream', async () => {
    let abortObserved = false;
    async function* abortable(
      _input: unknown,
    ): AsyncGenerator<{ delta: string; done: boolean; kind: string }> {
      yield { delta: 'first', done: false, kind: 'text' };
      // simulate the SDK observing the abort on the next pull
      abortObserved = true;
      throw new DOMException('aborted', 'AbortError');
    }
    openAiStreamMock.mockImplementation(abortable);
    const { publish, service } = buildService();

    const done = service.runStream(baseRun);
    service.cancel('conv-1');
    await done;

    expect(abortObserved).toBe(true);
    const last = publish.mock.calls.at(-1)?.[1].conversationStreamChunkAdded;
    expect(last).toMatchObject({ done: true });
  });
});
