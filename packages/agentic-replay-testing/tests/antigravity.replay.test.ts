/**
 * Replay recorded antigravity (`agy`) transcripts through the PRODUCTION
 * antigravity backend via `OPENTHROTTLE_ANTIGRAVITY_BIN`. agy mints its own
 * conversation id; the resume turn gets it from turn 1.
 */

import { CONVERSATION_STREAM_CHUNK_KINDS as KINDS } from '@openthrottle/openthrottle-agentic-utils';
import { describe, expect, it } from 'vitest';

import {
  ANTIGRAVITY_RECORDING_PROFILE,
  replayFixturePath,
} from '../src/index.ts';
import {
  countOf,
  replayStrict,
  terminal,
  textOf,
} from './support/replay-assertions.ts';

const replay = async (path: string): ReturnType<typeof replayStrict> => {
  return replayStrict(ANTIGRAVITY_RECORDING_PROFILE, path);
};

describe('antigravity replay', () => {
  it('simple-turn streams the reply, conversation and usage', async () => {
    const { chunks } = await replay(
      replayFixturePath('antigravity', 'simple-turn'),
    );

    expect(textOf(chunks).trim()).toBe('pong');
    expect(countOf(chunks, KINDS.session)).toBe(1);
  });

  it('tool-use, multi-tool and accept-edits pair calls with results', async () => {
    const tool = await replay(replayFixturePath('antigravity', 'tool-use'));
    const multi = await replay(replayFixturePath('antigravity', 'multi-tool'));
    const edits = await replay(
      replayFixturePath('antigravity', 'accept-edits'),
    );

    for (const { chunks } of [tool, multi, edits]) {
      expect(countOf(chunks, KINDS.toolCall)).toBe(
        countOf(chunks, KINDS.toolResult),
      );
    }
    expect(countOf(multi.chunks, KINDS.toolCall)).toBe(3);
  });

  it('permission-denied attempts the write but leaves no file', async () => {
    const { chunks } = await replay(
      replayFixturePath('antigravity', 'permission-denied'),
    );

    expect(countOf(chunks, KINDS.toolCall)).toBe(1);
  });

  it('error rejects the model selection', async () => {
    const { chunks } = await replay(replayFixturePath('antigravity', 'error'));

    expect(terminal(chunks)?.error).toContain('not-a-real-model');
  });

  it('interrupt ends interrupted', async () => {
    const { chunks } = await replay(
      replayFixturePath('antigravity', 'interrupt'),
    );

    expect(terminal(chunks)?.error).toBe('interrupted');
  });

  it('system-prompt and thinking complete', async () => {
    const persona = await replay(
      replayFixturePath('antigravity', 'system-prompt'),
    );
    const thinking = await replay(replayFixturePath('antigravity', 'thinking'));

    expect(textOf(persona.chunks).trim()).toBe('HELLO.');
    expect(terminal(thinking.chunks)?.error ?? null).toBeNull();
  });

  it('resume continues the CLI-minted conversation', async () => {
    const first = await replay(
      replayFixturePath('antigravity', 'resume.turn-1'),
    );
    const second = await replay(
      replayFixturePath('antigravity', 'resume.turn-2'),
    );

    expect(textOf(first.chunks).trim()).toBe('OK.');
    expect(second.transcript.argv).toContain('--conversation');
    expect(textOf(second.chunks).trim()).toBe('heron');
  });
});
