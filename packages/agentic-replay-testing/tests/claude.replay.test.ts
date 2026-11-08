/**
 * Replay every recorded claude transcript through the PRODUCTION claude
 * conversation backend (argv builder, spawn, env scrubbing, NDJSON parser,
 * event mapper) via its `OPENTHROTTLE_CLAUDE_BIN` override. Each test asserts
 * the replay bin matched the outbound argv strictly, then what the backend
 * made of the real CLI's output.
 */

import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationStreamChunk,
} from '@openthrottle/openthrottle-agentic-utils';
import { describe, expect, it } from 'vitest';

import {
  CLAUDE_RECORDING_PROFILE,
  replayFixture,
  replayFixturePath,
  type ReplayFixtureResult,
} from '../src/index.ts';

const replayClaude = async (path: string): Promise<ReplayFixtureResult> => {
  const result = await replayFixture({
    fixturePath: path,
    profile: CLAUDE_RECORDING_PROFILE,
  });
  expect(result.report).toEqual({ ok: true });
  return result;
};

const ofKind = (
  chunks: readonly ConversationStreamChunk[],
  kind: ConversationStreamChunk['kind'],
): ConversationStreamChunk[] => {
  return chunks.filter((chunk) => chunk.kind === kind);
};

const textOf = (chunks: readonly ConversationStreamChunk[]): string => {
  return ofKind(chunks, CONVERSATION_STREAM_CHUNK_KINDS.text)
    .map((chunk) => chunk.delta)
    .join('');
};

/** Tool names from the consolidated (argument-carrying) tool_call chunks. */
const toolCalls = (chunks: readonly ConversationStreamChunk[]): unknown[] => {
  return ofKind(chunks, CONVERSATION_STREAM_CHUNK_KINDS.toolCall)
    .filter((chunk) => chunk.metadata?.toolCall !== undefined)
    .map((chunk) => chunk.metadata?.toolName);
};

const toolResultErrors = (
  chunks: readonly ConversationStreamChunk[],
): unknown[] => {
  return ofKind(chunks, CONVERSATION_STREAM_CHUNK_KINDS.toolResult).map(
    (chunk) => chunk.metadata?.isError,
  );
};

const terminal = (
  chunks: readonly ConversationStreamChunk[],
): ConversationStreamChunk | undefined => {
  return chunks.findLast((chunk) => chunk.done);
};

describe('claude replay', () => {
  describe('simple-turn', () => {
    it('streams the text, the session and one terminal usage chunk', async () => {
      const { chunks } = await replayClaude(
        replayFixturePath('claude', 'simple-turn'),
      );

      expect(textOf(chunks)).toBe('pong');
      expect(
        ofKind(chunks, CONVERSATION_STREAM_CHUNK_KINDS.session),
      ).toHaveLength(1);
      expect(terminal(chunks)).toMatchObject({
        error: null,
        kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
      });
    });

    it('maps the allowed rate_limit_event to no usage limit', async () => {
      const { chunks, transcript } = await replayClaude(
        replayFixturePath('claude', 'simple-turn'),
      );

      expect(transcript.stdout.join('\n')).toContain('"rate_limit_event"');
      expect(
        ofKind(chunks, CONVERSATION_STREAM_CHUNK_KINDS.usageLimit),
      ).toEqual([]);
      expect(terminal(chunks)?.metadata?.usageLimit).toBeUndefined();
    });
  });

  describe('tool-use', () => {
    it('streams one Read call, its result, then the answer', async () => {
      const { chunks } = await replayClaude(
        replayFixturePath('claude', 'tool-use'),
      );

      expect(toolCalls(chunks)).toEqual(['Read']);
      expect(toolResultErrors(chunks)).toEqual([false]);
      expect(textOf(chunks)).toBe('Replay fixture notes');
    });
  });

  describe('multi-tool', () => {
    it('streams both tool calls and both results', async () => {
      const { chunks } = await replayClaude(
        replayFixturePath('claude', 'multi-tool'),
      );

      expect(toolCalls(chunks)).toEqual(['Bash', 'Read']);
      expect(toolResultErrors(chunks)).toEqual([false, false]);
    });
  });

  describe('permission-denied', () => {
    it('surfaces the denied write as an error tool result', async () => {
      const { chunks } = await replayClaude(
        replayFixturePath('claude', 'permission-denied'),
      );

      expect(toolCalls(chunks)).toEqual(['Write']);
      expect(toolResultErrors(chunks)).toEqual([true]);
      expect(terminal(chunks)?.error).toBeNull();
    });
  });

  describe('accept-edits', () => {
    it('lets the write through', async () => {
      const { chunks, transcript } = await replayClaude(
        replayFixturePath('claude', 'accept-edits'),
      );

      expect(transcript.argv).toContain('acceptEdits');
      expect(toolCalls(chunks)).toEqual(['Write']);
      expect(toolResultErrors(chunks)).toEqual([false]);
    });
  });

  describe('resume', () => {
    it('creates the session on turn 1', async () => {
      const { chunks, transcript } = await replayClaude(
        replayFixturePath('claude', 'resume.turn-1'),
      );

      expect(transcript.argv).toContain('--session-id');
      expect(textOf(chunks)).toBe('OK.');
    });

    it('resumes it on turn 2 and recalls the earlier turn', async () => {
      const { chunks, transcript } = await replayClaude(
        replayFixturePath('claude', 'resume.turn-2'),
      );

      expect(transcript.argv).toContain('--resume');
      expect(textOf(chunks)).toBe('heron');
    });
  });

  describe('error', () => {
    it('carries the CLI error onto the terminal chunk', async () => {
      const { chunks } = await replayClaude(
        replayFixturePath('claude', 'error'),
      );

      expect(textOf(chunks)).toBe('');
      expect(terminal(chunks)?.error).toContain('not-a-real-model');
    });
  });

  describe('interrupt', () => {
    it('ends with a cancelled terminal chunk after partial text', async () => {
      const { chunks } = await replayClaude(
        replayFixturePath('claude', 'interrupt'),
      );

      expect(textOf(chunks).startsWith('1')).toBe(true);
      expect(terminal(chunks)).toMatchObject({
        done: true,
        error: 'cancelled',
      });
    });
  });

  describe('thinking', () => {
    it('streams thinking before the answer', async () => {
      const { chunks, transcript } = await replayClaude(
        replayFixturePath('claude', 'thinking'),
      );
      const firstThinking = chunks.findIndex(
        (chunk) => chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.thinking,
      );
      const firstText = chunks.findIndex(
        (chunk) => chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.text,
      );

      expect(transcript.argv).toEqual(
        expect.arrayContaining(['--effort', 'max']),
      );
      expect(firstThinking).toBeGreaterThanOrEqual(0);
      expect(firstThinking).toBeLessThan(firstText);
    });
  });

  describe('system-prompt', () => {
    it('sends the persona as --append-system-prompt and follows it', async () => {
      const { chunks, transcript } = await replayClaude(
        replayFixturePath('claude', 'system-prompt'),
      );

      expect(transcript.argv).toContain('--append-system-prompt');
      expect(textOf(chunks)).toBe('HELLO.');
    });
  });
});
