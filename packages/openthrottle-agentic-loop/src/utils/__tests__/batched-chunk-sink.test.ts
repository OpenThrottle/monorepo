import { describe, expect, it } from 'vitest';

import type { ScheduleClock } from '../../contract/index.ts';
import { createBatchedChunkSink } from '../createBatchedChunkSink.ts';

const makeClock = () => {
  const timers: { callback: () => void; cancelled: boolean; ms: number }[] = [];
  const clock: ScheduleClock = {
    now: () => 0,
    schedule: (callback, ms) => {
      const timer = { callback, cancelled: false, ms };

      timers.push(timer);

      return () => {
        timer.cancelled = true;
      };
    },
  };

  return { clock, timers };
};

describe('createBatchedChunkSink', () => {
  it('flushes when the buffer reaches maxBytes', () => {
    const { clock } = makeClock();
    const chunks: string[] = [];
    const sink = createBatchedChunkSink(
      (text) => chunks.push(text),
      { maxBytes: 8, maxMs: 2000 },
      clock,
    );

    sink.push('abcd');
    expect(chunks).toEqual([]);
    sink.push('efgh');
    expect(chunks).toEqual(['abcdefgh']);
  });

  it('counts bytes, not characters', () => {
    const { clock } = makeClock();
    const chunks: string[] = [];
    const sink = createBatchedChunkSink(
      (text) => chunks.push(text),
      { maxBytes: 4, maxMs: 2000 },
      clock,
    );

    sink.push('éé');
    expect(chunks).toEqual(['éé']);
  });

  it('flushes maxMs after the first buffered text', () => {
    const { clock, timers } = makeClock();
    const chunks: string[] = [];
    const sink = createBatchedChunkSink(
      (text) => chunks.push(text),
      { maxBytes: 4096, maxMs: 2000 },
      clock,
    );

    sink.push('a');
    sink.push('b');
    expect(timers).toHaveLength(1);
    expect(timers[0]?.ms).toBe(2000);
    timers[0]?.callback();
    expect(chunks).toEqual(['ab']);
  });

  it('cancels the timer on a size flush and re-arms on the next push', () => {
    const { clock, timers } = makeClock();
    const sink = createBatchedChunkSink(
      () => undefined,
      { maxBytes: 2, maxMs: 2000 },
      clock,
    );

    sink.push('a');
    sink.push('b');
    expect(timers[0]?.cancelled).toBe(true);
    sink.push('c');
    expect(timers).toHaveLength(2);
  });

  it('flush() emits the remainder once and is a no-op when empty', () => {
    const { clock } = makeClock();
    const chunks: string[] = [];
    const sink = createBatchedChunkSink(
      (text) => chunks.push(text),
      { maxBytes: 4096, maxMs: 2000 },
      clock,
    );

    sink.push('tail');
    sink.flush();
    sink.flush();
    expect(chunks).toEqual(['tail']);
  });
});
