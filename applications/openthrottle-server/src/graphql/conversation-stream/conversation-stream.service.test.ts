import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  AgentConversationsService,
  AgentTokenUsageService,
} from '@openthrottle/nestjs-repositories';
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
  recordTurnUsage: ReturnType<typeof vi.fn>;
  service: ConversationStreamService;
} {
  const conversations = createMock<AgentConversationsService>({
    appendMessages: vi.fn().mockResolvedValue([]),
    updateModelSnapshot: vi.fn().mockResolvedValue(undefined),
  });
  const recordTurnUsage = vi.fn().mockResolvedValue(undefined);
  const tokenUsage = createMock<AgentTokenUsageService>({ recordTurnUsage });
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
    tokenUsage,
    {
      asyncIterator,
      publish,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
  );
  return { conversations, publish, recordTurnUsage, service };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  delete process.env.OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS;
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
    const { conversations, publish, recordTurnUsage, service } = buildService();

    await service.runStream({
      ...baseRun,
      backend: 'claude',
      cwd: '/repo',
      model: 'claude-opus-4-8',
      provider: 'claude',
    });

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
    // And a durable normalized usage row is written for the turn.
    expect(recordTurnUsage).toHaveBeenCalledTimes(1);
    expect(recordTurnUsage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      messageId: 'assistant-msg-1',
      model: 'claude-opus-4-8',
      provider: 'claude',
      usage: {
        costUsd: 0.04,
        inputTokens: 1200,
        outputTokens: 340,
        totalTokens: 1540,
      },
      userId: 'user-1',
    });
  });

  it('does NOT write a usage row for a Private-mode (persist:false) turn', async () => {
    async function* claudeWithUsage(): AsyncGenerator<{
      delta: string;
      done: boolean;
      error?: string | null;
      kind: string;
      metadata?: Record<string, unknown>;
    }> {
      yield { delta: 'Hi', done: false, kind: 'text' };
      yield {
        delta: '',
        done: true,
        error: null,
        kind: 'usage',
        metadata: { usage: { input_tokens: 10, output_tokens: 2 } },
      };
    }
    claudeStreamMock.mockImplementation(claudeWithUsage);
    const { conversations, recordTurnUsage, service } = buildService();

    await service.runStream({ ...baseRun, backend: 'claude', persist: false });

    expect(conversations.appendMessages).not.toHaveBeenCalled();
    expect(recordTurnUsage).not.toHaveBeenCalled();
  });

  it('sums opencode multiple mid-stream usage chunks into ONE usage row', async () => {
    async function* opencodeWithUsage(): AsyncGenerator<{
      delta: string;
      done: boolean;
      kind: string;
      metadata?: Record<string, unknown>;
    }> {
      yield { delta: 'Wor', done: false, kind: 'text' };
      yield {
        delta: '',
        done: false,
        kind: 'usage',
        metadata: {
          cost: 0.01,
          tokens: { cache: { read: 100, write: 0 }, input: 500, output: 20 },
        },
      };
      yield { delta: 'king', done: false, kind: 'text' };
      yield {
        delta: '',
        done: false,
        kind: 'usage',
        metadata: {
          cost: 0.02,
          tokens: { cache: { read: 40, write: 0 }, input: 300, output: 80 },
        },
      };
      yield { delta: '', done: true, kind: 'text' };
    }
    opencodeStreamMock.mockImplementation(opencodeWithUsage);
    const { recordTurnUsage, service } = buildService();

    await service.runStream({
      ...baseRun,
      backend: 'opencode',
      model: 'sonnet',
      provider: 'opencode',
    });

    expect(recordTurnUsage).toHaveBeenCalledTimes(1);
    expect(recordTurnUsage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      messageId: 'assistant-msg-1',
      model: 'sonnet',
      provider: 'opencode',
      usage: {
        cacheReadTokens: 140,
        cacheWriteTokens: 0,
        costUsd: expect.closeTo(0.03, 5),
        inputTokens: 800,
        outputTokens: 100,
        totalTokens: 900,
      },
      userId: 'user-1',
    });
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

  it('times out a stalled backend: retryable terminal chunk, partial persisted, controller cleared', async () => {
    vi.useFakeTimers();
    process.env.OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS = '5000';

    // Yields one chunk, then hangs forever (a wedged backend).
    async function* stalling(): AsyncGenerator<{
      delta: string;
      done: boolean;
      kind: string;
    }> {
      yield { delta: 'partial', done: false, kind: 'text' };
      await new Promise<never>(() => {});
    }
    openAiStreamMock.mockReturnValue(stalling());
    const { conversations, publish, service } = buildService();

    const done = service.runStream(baseRun);
    await vi.advanceTimersByTimeAsync(5000);
    await done;

    const last = publish.mock.calls.at(-1)?.[1].conversationStreamChunkAdded;
    expect(last).toMatchObject({
      done: true,
      metadataJson: JSON.stringify({ retryable: true, timedOut: true }),
    });
    expect(last.error).toContain('timed out');
    // The partial text is persisted so the turn is not lost.
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
    // The controller is cleared on completion (nothing left to cancel).
    expect(service.cancel('conv-1')).toBe(false);
  });

  it('treats keepalive liveness chunks as backstop-resetting only: never published/persisted, and they hold off the idle timeout', async () => {
    vi.useFakeTimers();
    process.env.OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS = '5000';

    const sleep = (ms: number): Promise<void> =>
      new Promise((resolve) => {
        setTimeout(resolve, ms);
      });

    // A backend that is ALIVE the whole time but only surfaces keepalive
    // liveness chunks for four idle-length stretches (4s < 5s each) before it
    // finally streams text. Total quiet time (16s) far exceeds the 5s backstop:
    // it only completes because each keepalive resets the idle timer in lockstep
    // with the CLI's own stdout timer.
    async function* aliveButQuiet(): AsyncGenerator<{
      delta: string;
      done: boolean;
      kind: string;
    }> {
      for (let i = 0; i < 4; i += 1) {
        // Spacing the keepalives out in sequence is the whole point — each must
        // arrive before the prior idle window elapses; the awaits are ordered.
        // eslint-disable-next-line no-await-in-loop
        await sleep(4000);
        yield { delta: '', done: false, kind: 'keepalive' };
      }
      await sleep(4000);
      yield { delta: 'Hello', done: false, kind: 'text' };
      yield { delta: '', done: true, kind: 'text' };
    }
    openAiStreamMock.mockImplementation(aliveButQuiet);
    const { conversations, publish, service } = buildService();

    const done = service.runStream(baseRun);
    await vi.advanceTimersByTimeAsync(30000);
    await done;

    const published = publish.mock.calls.map(
      ([, payload]) => payload.conversationStreamChunkAdded,
    );
    // Keepalives are dropped: only the single text delta + terminal done reach
    // the transcript, and the turn is NOT a timeout.
    expect(published).toEqual([
      expect.objectContaining({ delta: 'Hello', done: false, sortOrder: 0 }),
      expect.objectContaining({
        delta: '',
        done: true,
        error: null,
        sortOrder: 1,
      }),
    ]);
    expect(published.some((chunk) => chunk.kind === 'keepalive')).toBe(false);
    // The persisted assistant message is the clean text — no keepalive noise in
    // tool_metadata.
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
  });

  it('terminates a backend that ignores its abort signal (the race, not abort propagation)', async () => {
    vi.useFakeTimers();
    process.env.OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS = '5000';

    let capturedSignal: AbortSignal | undefined;
    // Captures the signal but NEVER observes it, then hangs — proving the
    // orchestrator's idle race (not the backend reacting to abort) ends the turn.
    async function* ignoresAbort(run: {
      signal?: AbortSignal;
    }): AsyncGenerator<{ delta: string; done: boolean; kind: string }> {
      capturedSignal = run.signal;
      yield { delta: 'x', done: false, kind: 'text' };
      await new Promise<never>(() => {});
    }
    openAiStreamMock.mockImplementation(ignoresAbort);
    const { publish, service } = buildService();

    const done = service.runStream(baseRun);
    await vi.advanceTimersByTimeAsync(5000);
    // `done` resolving at all is the proof the loop terminated despite the
    // backend ignoring its signal.
    await done;

    expect(capturedSignal?.aborted).toBe(true);
    const last = publish.mock.calls.at(-1)?.[1].conversationStreamChunkAdded;
    expect(last).toMatchObject({ done: true });
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
