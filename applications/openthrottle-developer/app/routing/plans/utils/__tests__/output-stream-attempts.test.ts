import { describe, expect, test } from 'vitest';

import { OUTPUT_STREAM_COPY } from '~/routing/plans/data/data.copy';

import {
  buildAttemptHeader,
  formatAttemptDuration,
  groupChunksIntoEntries,
  summarizeAttempt,
} from '../output-stream-attempts';
import type { OutputStreamChunk } from '../output-stream-chunks';

const chunk = (
  id: string,
  overrides: Partial<OutputStreamChunk>,
): OutputStreamChunk => {
  return {
    content: id,
    createdAt: new Date(2026, 10, 11, 10, 0, 0),
    id,
    iteration: 1,
    kind: 'worker',
    taskId: 't1',
    ...overrides,
  };
};

const at = (seconds: number): Date => {
  return new Date(2026, 10, 11, 10, 0, seconds);
};

describe('groupChunksIntoEntries', () => {
  test('folds consecutive chunks of one task and attempt into a group', () => {
    const entries = groupChunksIntoEntries([
      chunk('a', { kind: 'loop' }),
      chunk('b', { kind: 'tool' }),
      chunk('c', { iteration: 2, kind: 'worker' }),
    ]);

    expect(entries.map((entry) => entry.type)).toEqual(['attempt', 'attempt']);
  });

  test('leaves kindless and plan-scoped chunks plain and splits groups around them', () => {
    const entries = groupChunksIntoEntries([
      chunk('a', {}),
      chunk('ralph', { kind: null }),
      chunk('b', {}),
      chunk('plan', { taskId: null }),
    ]);

    expect(entries.map((entry) => entry.type)).toEqual([
      'attempt',
      'chunk',
      'attempt',
      'chunk',
    ]);
  });

  test('starts a new group when the task changes', () => {
    const entries = groupChunksIntoEntries([
      chunk('a', {}),
      chunk('b', { taskId: 't2' }),
    ]);

    expect(entries).toHaveLength(2);
  });
});

describe('summarizeAttempt', () => {
  const attempt = {
    chunks: [
      chunk('l', { content: '[ot-loop] task started', kind: 'loop' }),
      chunk('w1', { content: 'first', createdAt: at(0) }),
      chunk('tool', { content: '→ Read a', createdAt: at(30), kind: 'tool' }),
      chunk('w2', { content: '  Done.  ', createdAt: at(77) }),
      chunk('v', {
        content: `validation\nlint ✗ exit 1 · 54s\ntypecheck ✔ · 5s\n✗ raw tail`,
        createdAt: at(90),
        kind: 'validation',
      }),
    ],
    iteration: 1,
    taskId: 't1',
  };

  test('derives the closing summary, loop lines, validation labels and worker time', () => {
    const summary = summarizeAttempt(attempt);

    expect(summary.closingSummary).toBe('Done.');
    expect(summary.loopChunks.map((c) => c.id)).toEqual(['l']);
    expect(summary.preview).toEqual([
      { id: 'l', text: '[ot-loop] task started' },
      { id: 'w2', text: 'Done.' },
    ]);
    expect(summary.validationLabels).toEqual(['lint ✗', 'typecheck ✔']);
    expect(summary.workerDurationMs).toBe(77_000);
  });

  test('cuts a long closing summary to its last paragraph', () => {
    const long = `${'x'.repeat(700)}\n\nThe end.`;
    const summary = summarizeAttempt({
      ...attempt,
      chunks: [chunk('w', { content: long })],
    });

    expect(summary.closingSummary).toBe('The end.');
  });

  test('reports no worker time or validation when absent', () => {
    const lone = {
      chunks: [chunk('l', { kind: 'loop' })],
      iteration: 2,
      taskId: 't1',
    };
    const summary = summarizeAttempt(lone);

    expect(summary.workerDurationMs).toBeNull();
    expect(buildAttemptHeader(lone, summary)).toBe(
      OUTPUT_STREAM_COPY.attemptLabel(2),
    );
  });

  test('builds the full header', () => {
    expect(buildAttemptHeader(attempt, summarizeAttempt(attempt))).toBe(
      'Attempt 1 · worker 1m 17s · validation: lint ✗, typecheck ✔',
    );
  });
});

describe('formatAttemptDuration', () => {
  test('formats seconds and minutes', () => {
    expect(formatAttemptDuration(46_000)).toBe('46s');
    expect(formatAttemptDuration(77_000)).toBe('1m 17s');
  });
});
