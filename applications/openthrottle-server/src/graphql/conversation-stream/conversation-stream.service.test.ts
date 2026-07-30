import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { AgentConversationsService } from '@openthrottle/nestjs-repositories';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ConversationStreamService,
  type StartConversationStreamRun,
} from './conversation-stream.service';

const { claudeStreamMock, openAiStreamMock, opencodeStreamMock } = vi.hoisted(
  () => ({
    claudeStreamMock: vi.fn(),
    openAiStreamMock: vi.fn(),
    opencodeStreamMock: vi.fn(),
  }),
);

vi.mock('@openthrottle/openthrottle-agentic-utils', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/openthrottle-agentic-utils')
    >();
  return {
    ...actual,
    // The service routes via the CONVERSATION_CLI_BACKENDS registry, so the
    // mocked streams must be swapped INTO the registry (not just the individual
    // exports) for routing to reach them. cursor/codex/grok stay real (unused
    // here); openai is the default path (openAiConversationBackend, below).
    CONVERSATION_CLI_BACKENDS: {
      ...actual.CONVERSATION_CLI_BACKENDS,
      claude: { stream: claudeStreamMock },
      opencode: { stream: opencodeStreamMock },
    },
    claudeConversationBackend: { stream: claudeStreamMock },
    openAiConversationBackend: { stream: openAiStreamMock },
    opencodeConversationBackend: { stream: opencodeStreamMock },
  };
});

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
  fileMentions: [],
  mcpEnv: null,
  mcpServers: null,
  messages: [{ content: 'hi', role: 'user' }],
  model: 'llama3',
  permissionMode: null,
  persist: true,
  provider: 'ollama',
  reasoning: null,
  resumeSession: false,
  serviceTier: null,
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
  // A live iterator that ends immediately, so subscribe() yields only its
  // replay buffer in these tests.
  const asyncIterator = vi.fn(() => ({
    next: () => Promise.resolve({ done: true as const, value: undefined }),
    return: () => Promise.resolve({ done: true as const, value: undefined }),
  }));
  const service = new ConversationStreamService(
    conversations,
    createMock<LoggerService>(),
    {
      asyncIterator,
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

  it('forwards terminal usage metadata (claude/cursor) as a usage chunk and persists it', async () => {
    async function* claudeWithUsage(): AsyncGenerator<{
      delta: string;
      done: boolean;
      error?: string | null;
      kind: string;
      metadata?: Record<string, unknown>;
    }> {
      yield { delta: 'Hello', done: false, kind: 'text' };
      yield {
        delta: '',
        done: true,
        error: null,
        kind: 'usage',
        metadata: {
          result: 'Hello',
          totalCostUsd: 0.04,
          usage: { input_tokens: 1200, output_tokens: 340 },
        },
      };
    }
    claudeStreamMock.mockImplementation(claudeWithUsage);
    const { conversations, publish, service } = buildService();

    await service.runStream({ ...baseRun, backend: 'claude', cwd: '/repo' });

    const published = publish.mock.calls.map(
      ([, payload]) => payload.conversationStreamChunkAdded,
    );
    // text delta, then the forwarded usage chunk, then the terminal done chunk.
    expect(published).toEqual([
      expect.objectContaining({ delta: 'Hello', done: false, sortOrder: 0 }),
      expect.objectContaining({
        done: false,
        kind: 'usage',
        metadataJson: JSON.stringify({
          result: 'Hello',
          totalCostUsd: 0.04,
          usage: { input_tokens: 1200, output_tokens: 340 },
        }),
        sortOrder: 1,
      }),
      expect.objectContaining({ done: true, error: null, sortOrder: 2 }),
    ]);
    // The usage event is persisted into tool_metadata for reload.
    expect(conversations.appendMessages).toHaveBeenCalledWith(
      'user-1',
      'conv-1',
      [
        expect.objectContaining({
          content: 'Hello',
          toolMetadata: {
            events: [
              {
                delta: '',
                kind: 'usage',
                metadata: {
                  result: 'Hello',
                  totalCostUsd: 0.04,
                  usage: { input_tokens: 1200, output_tokens: 340 },
                },
              },
            ],
          },
        }),
      ],
    );
  });

  it('forwards a backend error reported on the terminal chunk', async () => {
    async function* claudeError(): AsyncGenerator<{
      delta: string;
      done: boolean;
      error?: string | null;
      kind: string;
      metadata?: Record<string, unknown>;
    }> {
      yield {
        delta: '',
        done: true,
        error: 'model_not_found',
        kind: 'usage',
        metadata: { result: 'model_not_found' },
      };
    }
    claudeStreamMock.mockImplementation(claudeError);
    const { publish, service } = buildService();

    await service.runStream({ ...baseRun, backend: 'claude', cwd: '/repo' });

    const last = publish.mock.calls.at(-1)?.[1].conversationStreamChunkAdded;
    expect(last).toMatchObject({ done: true, error: 'model_not_found' });
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

  it('routes the claude backend to the claude adapter', async () => {
    claudeStreamMock.mockReturnValue(fakeStream(['hi']));
    const { service } = buildService();

    await service.runStream({
      ...baseRun,
      backend: 'claude',
      cwd: '/repo',
      sessionId: 'uuid-1',
    });

    expect(claudeStreamMock).toHaveBeenCalledOnce();
    expect(openAiStreamMock).not.toHaveBeenCalled();
    // The resume flag is threaded through to the adapter run.
    expect(claudeStreamMock.mock.calls[0]?.[0]).toMatchObject({
      resumeSession: false,
      sessionId: 'uuid-1',
    });
  });

  it('persists an opencode-minted session id from the session chunk', async () => {
    async function* opencodeStream(): AsyncGenerator<{
      delta: string;
      done: boolean;
      kind: string;
      metadata?: Record<string, unknown>;
    }> {
      yield {
        delta: '',
        done: false,
        kind: 'session',
        metadata: { sessionId: 'ses_new' },
      };
      yield { delta: 'hi', done: false, kind: 'text' };
      yield { delta: '', done: true, kind: 'text' };
    }
    opencodeStreamMock.mockImplementation(opencodeStream);
    const { conversations, service } = buildService();

    await service.runStream({
      ...baseRun,
      backend: 'opencode',
      cwd: '/repo',
      sessionId: null,
    });

    expect(opencodeStreamMock).toHaveBeenCalledOnce();
    expect(conversations.updateMetadata).toHaveBeenCalledWith('conv-1', {
      opencodeSessionId: 'ses_new',
    });
  });

  it('Private mode (persist=false) streams every chunk but writes nothing to the DB', async () => {
    openAiStreamMock.mockReturnValue(fakeStream(['Hel', 'lo']));
    const { conversations, publish, service } = buildService();

    await service.runStream({ ...baseRun, persist: false });

    // The live stream is unaffected: every delta + the terminal chunk publish.
    const published = publish.mock.calls.map(
      ([, payload]) => payload.conversationStreamChunkAdded,
    );
    expect(published).toEqual([
      expect.objectContaining({ delta: 'Hel', done: false, sortOrder: 0 }),
      expect.objectContaining({ delta: 'lo', done: false, sortOrder: 1 }),
      expect.objectContaining({ delta: '', done: true, sortOrder: 2 }),
    ]);
    // But nothing is persisted: no assistant message, no model snapshot.
    expect(conversations.appendMessages).not.toHaveBeenCalled();
    expect(conversations.updateModelSnapshot).not.toHaveBeenCalled();
  });

  it('does not persist a CLI-minted session id in Private mode', async () => {
    async function* opencodeStream(): AsyncGenerator<{
      delta: string;
      done: boolean;
      kind: string;
      metadata?: Record<string, unknown>;
    }> {
      yield {
        delta: '',
        done: false,
        kind: 'session',
        metadata: { sessionId: 'ses_new' },
      };
      yield { delta: 'hi', done: false, kind: 'text' };
      yield { delta: '', done: true, kind: 'text' };
    }
    opencodeStreamMock.mockImplementation(opencodeStream);
    const { conversations, service } = buildService();

    await service.runStream({
      ...baseRun,
      backend: 'opencode',
      cwd: '/repo',
      persist: false,
      sessionId: null,
    });

    expect(conversations.updateMetadata).not.toHaveBeenCalled();
  });

  it('registers a Private-mode owner via start() (user-scoped), never for a persisted stream', () => {
    openAiStreamMock.mockReturnValue(fakeStream(['x']));
    const { service } = buildService();

    service.start({ ...baseRun, persist: false });
    expect(service.isEphemeralOwner('user-1', 'conv-1')).toBe(true);
    expect(service.isEphemeralOwner('someone-else', 'conv-1')).toBe(false);

    service.start({ ...baseRun, conversationId: 'conv-2', persist: true });
    expect(service.isEphemeralOwner('user-1', 'conv-2')).toBe(false);
  });

  it('does not re-persist a session id the CLI merely echoes back', async () => {
    async function* echoSession(): AsyncGenerator<{
      delta: string;
      done: boolean;
      kind: string;
      metadata?: Record<string, unknown>;
    }> {
      yield {
        delta: '',
        done: false,
        kind: 'session',
        metadata: { sessionId: 'ses_known' },
      };
      yield { delta: '', done: true, kind: 'text' };
    }
    opencodeStreamMock.mockImplementation(echoSession);
    const { conversations, service } = buildService();

    await service.runStream({
      ...baseRun,
      backend: 'opencode',
      cwd: '/repo',
      sessionId: 'ses_known',
    });

    expect(conversations.updateMetadata).not.toHaveBeenCalled();
  });
});

describe('ConversationStreamService.subscribe (replay buffer)', () => {
  it('replays the finished turn to a late subscriber (incl. the terminal chunk)', async () => {
    openAiStreamMock.mockReturnValue(fakeStream(['Hel', 'lo']));
    const { service } = buildService();

    // Turn runs to completion before anyone subscribes.
    await service.runStream(baseRun);

    const replayed: Array<{ delta: string; done: boolean; sortOrder: number }> =
      [];
    for await (const value of service.subscribe('conv-1')) {
      replayed.push(value.conversationStreamChunkAdded);
    }

    expect(replayed).toEqual([
      expect.objectContaining({ delta: 'Hel', done: false, sortOrder: 0 }),
      expect.objectContaining({ delta: 'lo', done: false, sortOrder: 1 }),
      expect.objectContaining({ delta: '', done: true, sortOrder: 2 }),
    ]);
  });

  it('starts a fresh buffer for a new turn (does not replay the prior turn)', async () => {
    const { service } = buildService();

    openAiStreamMock.mockReturnValueOnce(fakeStream(['old']));
    await service.runStream(baseRun);

    openAiStreamMock.mockReturnValueOnce(fakeStream(['new']));
    await service.runStream(baseRun);

    const replayed: string[] = [];
    for await (const value of service.subscribe('conv-1')) {
      replayed.push(value.conversationStreamChunkAdded.delta);
    }

    expect(replayed).toContain('new');
    expect(replayed).not.toContain('old');
  });
});
