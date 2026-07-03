import { describe, expect, it } from 'vitest';

import {
  INITIAL_TRANSCRIPTION_SNAPSHOT,
  reduceTranscriptionChunk,
} from '../useTranscriptionStream';

const chunk = (overrides: {
  done?: boolean;
  error?: string | null;
  sortOrder: number;
  transcript?: string;
}) => ({
  done: overrides.done ?? false,
  error: overrides.error ?? null,
  sessionId: 'session-1',
  sortOrder: overrides.sortOrder,
  transcript: overrides.transcript ?? '',
});

describe('reduceTranscriptionChunk', () => {
  it('replaces the transcript wholesale with each newer snapshot', () => {
    let state = INITIAL_TRANSCRIPTION_SNAPSHOT;
    state = reduceTranscriptionChunk(
      state,
      chunk({ sortOrder: 0, transcript: ' Hello wor' }),
    );
    state = reduceTranscriptionChunk(
      state,
      chunk({ sortOrder: 1, transcript: ' Hello world.' }),
    );

    expect(state.transcript).toBe(' Hello world.');
    expect(state.sortOrder).toBe(1);
  });

  it('lets a newer snapshot shrink the transcript (revising tail)', () => {
    let state = INITIAL_TRANSCRIPTION_SNAPSHOT;
    state = reduceTranscriptionChunk(
      state,
      chunk({ sortOrder: 0, transcript: ' Testing one two three four' }),
    );
    state = reduceTranscriptionChunk(
      state,
      chunk({ sortOrder: 1, transcript: ' Testing 1-2-3.' }),
    );

    expect(state.transcript).toBe(' Testing 1-2-3.');
  });

  it('drops stale and duplicate snapshots (keeps the highest sortOrder)', () => {
    let state = INITIAL_TRANSCRIPTION_SNAPSHOT;
    state = reduceTranscriptionChunk(
      state,
      chunk({ sortOrder: 5, transcript: 'newest' }),
    );
    const afterStale = reduceTranscriptionChunk(
      state,
      chunk({ sortOrder: 3, transcript: 'older' }),
    );
    const afterDuplicate = reduceTranscriptionChunk(
      state,
      chunk({ sortOrder: 5, transcript: 'duplicate' }),
    );

    expect(afterStale).toBe(state);
    expect(afterDuplicate).toBe(state);
    expect(state.transcript).toBe('newest');
  });

  it('latches done and carries the terminal error', () => {
    let state = INITIAL_TRANSCRIPTION_SNAPSHOT;
    state = reduceTranscriptionChunk(
      state,
      chunk({ sortOrder: 0, transcript: ' Hi' }),
    );
    state = reduceTranscriptionChunk(
      state,
      chunk({
        done: true,
        error: 'Transcription session reaped after 15s without audio.',
        sortOrder: 1,
        transcript: ' Hi',
      }),
    );

    expect(state.done).toBe(true);
    expect(state.error).toContain('reaped');
  });

  it('starts empty, not-done, at sortOrder -1', () => {
    expect(INITIAL_TRANSCRIPTION_SNAPSHOT).toEqual({
      done: false,
      error: null,
      sortOrder: -1,
      transcript: '',
    });
  });
});
