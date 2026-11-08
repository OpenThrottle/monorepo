/**
 * Replay recorded codex transcripts through the PRODUCTION codex backend via
 * `OPENTHROTTLE_CODEX_BIN`. codex mints its own thread id, so the resume turn
 * is replayed after turn 1, which supplies it.
 */

import { CONVERSATION_STREAM_CHUNK_KINDS as KINDS } from '@openthrottle/openthrottle-agentic-utils';
import { describe, expect, it } from 'vitest';

import { CODEX_RECORDING_PROFILE, replayFixturePath } from '../src/index.ts';
import {
  countOf,
  replayStrict,
  terminal,
  textOf,
} from './support/replay-assertions.ts';

const replay = async (path: string): ReturnType<typeof replayStrict> => {
  return replayStrict(CODEX_RECORDING_PROFILE, path);
};

describe('codex replay', () => {
  it('simple-turn streams the reply, the thread and usage', async () => {
    const { chunks } = await replay(replayFixturePath('codex', 'simple-turn'));

    expect(textOf(chunks)).toBe('pong');
    expect(countOf(chunks, KINDS.session)).toBe(1);
    expect(terminal(chunks)?.error ?? null).toBeNull();
  });

  it('tool-use and multi-tool surface tool results', async () => {
    const single = await replay(replayFixturePath('codex', 'tool-use'));
    const multi = await replay(replayFixturePath('codex', 'multi-tool'));

    expect(countOf(single.chunks, KINDS.toolResult)).toBe(1);
    expect(countOf(multi.chunks, KINDS.toolResult)).toBeGreaterThanOrEqual(1);
  });

  it('accept-edits runs the write', async () => {
    const { chunks } = await replay(replayFixturePath('codex', 'accept-edits'));

    expect(countOf(chunks, KINDS.toolResult)).toBe(1);
  });

  it('permission-denied stays in the read-only sandbox', async () => {
    const { chunks, transcript } = await replay(
      replayFixturePath('codex', 'permission-denied'),
    );

    expect(transcript.argv).toEqual(
      expect.arrayContaining(['--sandbox', 'read-only']),
    );
    expect(textOf(chunks)).toBe('denied');
  });

  it('error carries the unsupported model onto the terminal chunk', async () => {
    const { chunks } = await replay(replayFixturePath('codex', 'error'));

    expect(terminal(chunks)?.error).toContain('not-a-real-model');
  });

  it('interrupt ends cancelled after partial text', async () => {
    const { chunks } = await replay(replayFixturePath('codex', 'interrupt'));

    expect(textOf(chunks).startsWith('1')).toBe(true);
    expect(terminal(chunks)?.error).toBe('cancelled');
  });

  it('system-prompt and thinking complete', async () => {
    const persona = await replay(replayFixturePath('codex', 'system-prompt'));
    const thinking = await replay(replayFixturePath('codex', 'thinking'));

    expect(textOf(persona.chunks)).toBe('HELLO');
    expect(textOf(thinking.chunks)).toBe('1289');
  });

  describe('resume', () => {
    it('turn 1 starts a thread', async () => {
      const { chunks } = await replay(
        replayFixturePath('codex', 'resume.turn-1'),
      );

      expect(textOf(chunks)).toBe('OK.');
    });

    it('turn 2 fails: codex exec resume rejects --sandbox (known bug)', async () => {
      // Characterization of a production bug the recording found: codex
      // 0.167's `exec resume` has no --sandbox option, so every follow-up
      // turn of a codex chat exits with a usage error. When the argv builder
      // is fixed, re-record this transcript and assert the recalled word.
      const { chunks, transcript } = await replay(
        replayFixturePath('codex', 'resume.turn-2'),
      );

      expect(transcript.argv.slice(0, 2)).toEqual(['exec', 'resume']);
      expect(terminal(chunks)?.error).toContain(
        "unexpected argument '--sandbox'",
      );
    });
  });
});
