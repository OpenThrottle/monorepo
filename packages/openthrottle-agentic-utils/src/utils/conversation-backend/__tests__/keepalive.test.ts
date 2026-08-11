import { describe, expect, it } from 'vitest';

import { CONVERSATION_KEEPALIVE_CHUNK, withKeepalive } from '../keepalive.ts';
import {
  CONVERSATION_STREAM_CHUNK_KINDS,
  type ConversationStreamChunk,
} from '../types.ts';

const text = (delta: string): ConversationStreamChunk => ({
  delta,
  done: false,
  kind: CONVERSATION_STREAM_CHUNK_KINDS.text,
});

describe('withKeepalive', () => {
  it('passes mapped chunks through unchanged and adds NO keepalive', () => {
    const out = [...withKeepalive([text('a'), text('b')])];

    expect(out).toEqual([text('a'), text('b')]);
    expect(
      out.some(
        (chunk) => chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.keepalive,
      ),
    ).toBe(false);
  });

  it('emits exactly one keepalive when a stdout read produced no mapped chunk', () => {
    // This is the crux of the generalized fix: every spawned CLI backend routes
    // its per-read emitter through withKeepalive, so a read of null-mapped
    // liveness events (which yields nothing) still surfaces activity to the
    // server idle backstop — a future backend cannot silently starve it.
    const out = [...withKeepalive([])];

    expect(out).toEqual([CONVERSATION_KEEPALIVE_CHUNK]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      delta: '',
      done: false,
      kind: CONVERSATION_STREAM_CHUNK_KINDS.keepalive,
    });
  });

  it('does not substitute a keepalive when at least one chunk was produced', () => {
    const out = [...withKeepalive([text('only')])];

    expect(out).toEqual([text('only')]);
  });

  it('exposes a frozen, empty, non-terminal keepalive chunk', () => {
    expect(Object.isFrozen(CONVERSATION_KEEPALIVE_CHUNK)).toBe(true);
    expect(CONVERSATION_KEEPALIVE_CHUNK).toMatchObject({
      delta: '',
      done: false,
      kind: 'keepalive',
    });
    expect(CONVERSATION_KEEPALIVE_CHUNK.metadata).toBeUndefined();
  });
});
