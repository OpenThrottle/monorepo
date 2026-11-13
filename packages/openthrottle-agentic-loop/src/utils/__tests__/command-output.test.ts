import { describe, expect, it } from 'vitest';

import type { ScheduleClock } from '../../contract/index.ts';
import {
  createAnsiStripStream,
  createBatchedChunkSink,
  formatDuration,
  labelForCommand,
  stripAnsi,
  summarizeCommand,
} from '../command-output.ts';

const ESC = String.fromCharCode(27);
const GREEN_CHECK = `${ESC}[32m✔${ESC}[39m`;

describe('stripAnsi', () => {
  it('removes color sequences and keeps the text', () => {
    expect(stripAnsi(`${GREEN_CHECK} ok`)).toBe('✔ ok');
  });
});

describe('createAnsiStripStream', () => {
  it('holds back an escape sequence split across pushes', () => {
    const emitted: string[] = [];
    const stream = createAnsiStripStream((text) => emitted.push(text));

    stream.push(`a${ESC}`);
    stream.push('[3');
    stream.push(`2mb${ESC}[39`);
    stream.push('mc');
    stream.flush();

    expect(emitted.join('')).toBe('abc');
    expect(emitted.join('')).not.toContain(ESC);
  });

  it('drops a dangling partial escape on flush', () => {
    const emitted: string[] = [];
    const stream = createAnsiStripStream((text) => emitted.push(text));

    stream.push(`x${ESC}[`);
    stream.flush();

    expect(emitted.join('')).toBe('x');
  });
});

describe('labelForCommand', () => {
  it('uses the targets of nx affected and run-many', () => {
    expect(
      labelForCommand('pnpm nx affected -t typecheck --base=abc --parallel=1'),
    ).toBe('typecheck');
    expect(
      labelForCommand('pnpm nx run-many -t lint,typecheck,test --parallel=1'),
    ).toBe('lint,typecheck,test');
    expect(
      labelForCommand('pnpm nx run-many --target=codegen-graphql --all'),
    ).toBe('codegen-graphql');
    expect(labelForCommand('pnpm nx affected -t lint test --base=x')).toBe(
      'lint,test',
    );
  });

  it('collapses and truncates any other command to one line', () => {
    expect(labelForCommand('pnpm nx format:check')).toBe(
      'pnpm nx format:check',
    );
    expect(labelForCommand('a\n  b')).toBe('a b');
    expect(labelForCommand('x'.repeat(100))).toHaveLength(60);
  });
});

describe('formatDuration', () => {
  it('formats seconds and minutes', () => {
    expect(formatDuration(46_400)).toBe('46s');
    expect(formatDuration(125_000)).toBe('2m 5s');
  });
});

describe('summarizeCommand', () => {
  it('renders green, red and timed out', () => {
    const base = { command: 'pnpm nx affected -t lint', durationMs: 54_000 };

    expect(summarizeCommand({ ...base, outcome: { kind: 'green' } })).toBe(
      'lint ✔ · 54s',
    );
    expect(
      summarizeCommand({ ...base, outcome: { exitCode: 1, kind: 'red' } }),
    ).toBe('lint ✗ exit 1 · 54s');
    expect(summarizeCommand({ ...base, outcome: { kind: 'timed_out' } })).toBe(
      'lint ✗ timed out · 54s',
    );
  });
});

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
