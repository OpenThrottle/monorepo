/**
 * Replay recorded claude transcripts through the REAL conversation-stream
 * service and the REAL claude backend — no `@openthrottle/openthrottle-agentic-utils`
 * mock. The only stand-ins sit at the edges: the CLI process (a replay bin
 * installed through `OPENTHROTTLE_CLAUDE_BIN`), the ids (`randomUUID`, seeded),
 * the clock (`Date`, frozen) and the persistence services.
 *
 * The replay bin asserts the argv strictly, so a change anywhere between the
 * service's run and the spawned argv fails here, and the published chunks are
 * asserted against what the real CLI actually emitted.
 */

import { createMock } from '@golevelup/ts-vitest';
import {
  type PreparedReplay,
  prepareReplay,
  replayFixturePath,
  withBinEnv,
} from '@openthrottle/agentic-replay-testing';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  AgentConversationsService,
  AgentTokenUsageService,
} from '@openthrottle/nestjs-repositories';
import { CLAUDE_BIN_ENV } from '@openthrottle/openthrottle-agentic-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConversationStreamService } from './conversation-stream.service.ts';
import type { StartConversationStreamRun } from './conversation-stream.types.ts';

const ids = vi.hoisted(() => ({ next: 0 }));

vi.mock('node:crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:crypto')>();
  return {
    ...actual,
    randomUUID: () => {
      ids.next += 1;
      return `00000000-0000-4000-9000-${String(ids.next).padStart(12, '0')}`;
    },
  };
});

const seededId = (index: number): string => {
  return `00000000-0000-4000-9000-${String(index).padStart(12, '0')}`;
};

interface Harness {
  readonly appendMessages: ReturnType<typeof vi.fn>;
  readonly published: () => Array<Record<string, unknown>>;
  readonly recordTurnUsage: ReturnType<typeof vi.fn>;
  readonly service: ConversationStreamService;
}

function buildHarness(): Harness {
  const appendMessages = vi.fn().mockResolvedValue([]);
  const recordTurnUsage = vi.fn().mockResolvedValue(undefined);
  const publish = vi.fn().mockResolvedValue(undefined);
  const service = new ConversationStreamService(
    createMock<AgentConversationsService>({
      appendMessages,
      updateModelSnapshot: vi.fn().mockResolvedValue(undefined),
    }),
    createMock<LoggerService>(),
    createMock<AgentTokenUsageService>({ recordTurnUsage }),
    {
      asyncIterator: vi.fn(),
      publish,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
  );

  const published = (): Array<Record<string, unknown>> => {
    return publish.mock.calls.map(
      ([, payload]) => payload.conversationStreamChunkAdded,
    );
  };

  return { appendMessages, published, recordTurnUsage, service };
}

/** The service input that reproduces a prepared replay's backend run. */
function toServiceRun(prepared: PreparedReplay): StartConversationStreamRun {
  const { run } = prepared;
  return {
    additionalDirectories: [],
    assistantMessageId: 'assistant-1',
    backend: 'claude',
    baseUrl: null,
    conversationId: 'conversation-1',
    cwd: prepared.cwd,
    fileMentions: [],
    mcpEnv: null,
    mcpServers: null,
    messages: run.messages,
    model: run.model,
    permissionMode: run.permissionMode ?? null,
    persist: true,
    provider: 'claude',
    reasoning: run.reasoning ?? null,
    resumeSession: run.resumeSession ?? false,
    serviceTier: null,
    sessionId: run.sessionId ?? null,
    systemPrompt: run.systemPrompt ?? null,
    userId: 'user-1',
  };
}

let prepared: PreparedReplay | null = null;

async function replayThroughService(
  stem: string,
): Promise<Harness & { readonly prepared: PreparedReplay }> {
  const replay = prepareReplay(replayFixturePath('claude', stem));
  prepared = replay;
  const harness = buildHarness();

  await withBinEnv(CLAUDE_BIN_ENV, replay.bin, async () => {
    await harness.service.runStream(toServiceRun(replay));
  });

  expect(replay.readReport()).toEqual({ ok: true });
  return { ...harness, prepared: replay };
}

beforeEach(() => {
  ids.next = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-07T12:00:00.000Z'));
});

afterEach(() => {
  prepared?.dispose();
  prepared = null;
  vi.useRealTimers();
});

describe('ConversationStreamService replaying claude', () => {
  describe('simple-turn', () => {
    it('publishes the recorded turn with seeded ids, in order', async () => {
      const { published } = await replayThroughService('simple-turn');

      const visible = published().filter((chunk) => chunk.kind !== 'keepalive');
      expect(
        visible.map(({ delta, done, error, kind }) => ({
          delta,
          done,
          error,
          kind,
        })),
      ).toEqual([
        { delta: '', done: false, error: null, kind: 'session' },
        { delta: 'pong', done: false, error: null, kind: 'text' },
        { delta: '', done: false, error: null, kind: 'usage' },
        { delta: '', done: true, error: null, kind: 'text' },
      ]);
      for (const chunk of published()) {
        expect(chunk.id).toMatch(/^00000000-0000-4000-9000-\d{12}$/);
        expect(chunk.messageId).toBe('assistant-1');
      }
      expect(published()[0]?.id).toBe(seededId(1));
    });

    it('persists the assistant message and the real token usage', async () => {
      const { appendMessages, recordTurnUsage } =
        await replayThroughService('simple-turn');

      expect(appendMessages).toHaveBeenCalledWith('user-1', 'conversation-1', [
        expect.objectContaining({
          content: 'pong',
          id: 'assistant-1',
          role: 'assistant',
        }),
      ]);
      expect(recordTurnUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conversation-1',
          provider: 'claude',
          usage: expect.objectContaining({ outputTokens: 4 }),
        }),
      );
    });
  });

  describe('tool-use', () => {
    it('persists the tool call and result in the message timeline', async () => {
      const { appendMessages } = await replayThroughService('tool-use');

      const [, , [message]] = appendMessages.mock.calls[0] ?? [];
      const kinds = message.toolMetadata.events.map(
        (event: { kind: string }) => event.kind,
      );
      expect(message.content).toBe('Replay fixture notes');
      expect(kinds).toEqual(
        expect.arrayContaining(['tool_call', 'tool_result', 'text']),
      );
    });
  });

  describe('error', () => {
    it('forwards the CLI error onto the published terminal chunk', async () => {
      const { published } = await replayThroughService('error');

      expect(published().at(-1)).toMatchObject({
        done: true,
        error: expect.stringContaining('not-a-real-model'),
      });
    });
  });

  describe('resume.turn-2', () => {
    it('resumes the session the service was given', async () => {
      const { appendMessages, prepared: replay } =
        await replayThroughService('resume.turn-2');

      expect(replay.transcript.argv).toContain('--resume');
      expect(appendMessages).toHaveBeenCalledWith('user-1', 'conversation-1', [
        expect.objectContaining({ content: 'heron' }),
      ]);
    });
  });
});
