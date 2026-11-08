/**
 * Replay recorded opencode transcripts through the PRODUCTION opencode backend
 * via `OPENTHROTTLE_OPENCODE_BIN`. opencode mints `ses_…` ids (not UUIDs, so
 * left literal by the sanitizer); the resume turn gets it from turn 1.
 *
 * permission-denied was recorded with `opencode/big-pickle`: on the recording
 * host the account default model was unavailable. Supervised writes
 * `edit`/`bash: ask` into the temp config, which a headless run auto-rejects.
 * The opencode plan-run transcripts (same model, same reason) are replayed in
 * ralph.replay.test.ts.
 */

import { CONVERSATION_STREAM_CHUNK_KINDS as KINDS } from '@openthrottle/openthrottle-agentic-utils';
import { describe, expect, it } from 'vitest';

import { OPENCODE_RECORDING_PROFILE, replayFixturePath } from '../src/index.ts';
import {
  countOf,
  ofKind,
  replayStrict,
  terminal,
  textOf,
} from './support/replay-assertions.ts';

const replay = async (path: string): ReturnType<typeof replayStrict> => {
  return replayStrict(OPENCODE_RECORDING_PROFILE, path);
};

describe('opencode replay', () => {
  it('simple-turn streams the reply, session and usage', async () => {
    const { chunks } = await replay(
      replayFixturePath('opencode', 'simple-turn'),
    );

    expect(textOf(chunks)).toBe('pong');
    expect(countOf(chunks, KINDS.session)).toBe(1);
  });

  it('tool-use, multi-tool and accept-edits report successful tools', async () => {
    const tool = await replay(replayFixturePath('opencode', 'tool-use'));
    const multi = await replay(replayFixturePath('opencode', 'multi-tool'));
    const edits = await replay(replayFixturePath('opencode', 'accept-edits'));

    expect(countOf(tool.chunks, KINDS.toolResult)).toBe(1);
    expect(countOf(multi.chunks, KINDS.toolResult)).toBe(2);
    expect(textOf(edits.chunks)).toBe('done.');
  });

  it('permission-denied rejects the write as an error tool result', async () => {
    const { chunks } = await replay(
      replayFixturePath('opencode', 'permission-denied'),
    );
    const results = ofKind(chunks, KINDS.toolResult);

    expect(countOf(chunks, KINDS.toolCall)).toBe(1);
    expect(results.map((chunk) => chunk.metadata?.isError)).toEqual([true]);
    expect(terminal(chunks)?.error ?? null).toBeNull();
  });

  it('error surfaces the non-zero exit', async () => {
    const { chunks } = await replay(replayFixturePath('opencode', 'error'));

    expect(terminal(chunks)?.error).toContain('exited with code 1');
  });

  it('interrupt ends cancelled', async () => {
    const { chunks } = await replay(replayFixturePath('opencode', 'interrupt'));

    expect(terminal(chunks)?.error).toBe('cancelled');
  });

  it('system-prompt and thinking complete', async () => {
    const persona = await replay(
      replayFixturePath('opencode', 'system-prompt'),
    );
    const thinking = await replay(replayFixturePath('opencode', 'thinking'));

    expect(textOf(persona.chunks)).toBe('HELLO.');
    expect(textOf(thinking.chunks)).toBe('1289');
  });

  it('resume passes the CLI-minted session back on turn 2', async () => {
    const first = await replay(replayFixturePath('opencode', 'resume.turn-1'));
    const second = await replay(replayFixturePath('opencode', 'resume.turn-2'));

    expect(textOf(first.chunks)).toBe('OK.');
    expect(second.transcript.argv).toContain('-s');
    expect(textOf(second.chunks)).toBe('heron');
  });
});
