/**
 * Replay recorded cursor-agent transcripts through the PRODUCTION cursor
 * backend via `OPENTHROTTLE_CURSOR_AGENT_BIN`. The chat id was minted with
 * `create-chat` at record time and sanitized to `placeholderUuid(1)`.
 *
 * There is deliberately no permission-denied transcript: in the supervised
 * posture cursor-agent wrote the file (and ran a shell command) without
 * approval, so the recorder refused it. That is a filed follow-up, not a
 * fixture.
 */

import { CONVERSATION_STREAM_CHUNK_KINDS as KINDS } from '@openthrottle/openthrottle-agentic-utils';
import { describe, expect, it } from 'vitest';

import { CURSOR_RECORDING_PROFILE, replayFixturePath } from '../src/index.ts';
import {
  countOf,
  replayStrict,
  terminal,
  textOf,
} from './support/replay-assertions.ts';

const replay = async (path: string): ReturnType<typeof replayStrict> => {
  return replayStrict(CURSOR_RECORDING_PROFILE, path);
};

describe('cursor replay', () => {
  it('simple-turn streams thinking then the reply', async () => {
    const { chunks } = await replay(replayFixturePath('cursor', 'simple-turn'));

    expect(textOf(chunks)).toBe('pong');
    expect(countOf(chunks, KINDS.thinking)).toBeGreaterThan(0);
    expect(terminal(chunks)?.error ?? null).toBeNull();
  });

  it('tool-use, multi-tool and accept-edits pair calls with results', async () => {
    const tool = await replay(replayFixturePath('cursor', 'tool-use'));
    const multi = await replay(replayFixturePath('cursor', 'multi-tool'));
    const edits = await replay(replayFixturePath('cursor', 'accept-edits'));

    for (const { chunks } of [tool, multi, edits]) {
      expect(countOf(chunks, KINDS.toolCall)).toBe(
        countOf(chunks, KINDS.toolResult),
      );
      expect(countOf(chunks, KINDS.toolCall)).toBeGreaterThan(0);
    }
  });

  it('error names the rejected model', async () => {
    const { chunks } = await replay(replayFixturePath('cursor', 'error'));

    expect(terminal(chunks)?.error).toContain('not-a-real-model');
  });

  it('interrupt ends cancelled after partial text', async () => {
    const { chunks } = await replay(replayFixturePath('cursor', 'interrupt'));

    expect(terminal(chunks)?.error).toBe('cancelled');
  });

  it('system-prompt and thinking complete', async () => {
    const persona = await replay(replayFixturePath('cursor', 'system-prompt'));
    const thinking = await replay(replayFixturePath('cursor', 'thinking'));

    expect(textOf(persona.chunks)).toBe('HELLO.');
    expect(countOf(thinking.chunks, KINDS.thinking)).toBeGreaterThan(0);
  });

  it('resume continues the minted chat across turns', async () => {
    const first = await replay(replayFixturePath('cursor', 'resume.turn-1'));
    const second = await replay(replayFixturePath('cursor', 'resume.turn-2'));

    expect(textOf(first.chunks)).toBe('OK.');
    expect(textOf(second.chunks)).toBe('heron');
  });
});
