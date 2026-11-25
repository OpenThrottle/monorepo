import { describe, expect, it, vi } from 'vitest';

import type { OtClient, OtTask, OtTaskUpdate } from '../createOtClient.ts';
import type { XClient, XTweetMetrics } from '../createXClient.ts';
import { parseSocialPost } from '../parseSocialPost.ts';
import { runXMetrics } from '../runXMetrics.ts';

const NOW = new Date('2026-12-02T15:05:00.000Z');

const makeTask = (
  id: string,
  completedAt: string | undefined,
  payload: Record<string, unknown>,
  status = 'COMPLETED',
): OtTask => {
  return {
    completedAt,
    id,
    requirementsJson: JSON.stringify([payload]),
    sortOrder: 1000,
    status,
    summary: `Posted 1 tweet(s): https://x.com/i/web/status/${id}`,
    title: `Tweet ${id}`,
    updatedAt: undefined,
  };
};

const createOt = (tasks: readonly OtTask[]) => {
  const updates: OtTaskUpdate[] = [];
  const client: OtClient = {
    appendOutput: async () => {
      return { ok: true, value: undefined };
    },
    listTasks: async () => {
      return { ok: true, value: tasks };
    },
    updateTask: async (update) => {
      updates.push(update);
      const task = tasks.find((row) => row.id === update.id);

      return task === undefined
        ? { error: 'not found', ok: false }
        : { ok: true, value: task };
    },
  };

  return { client, updates };
};

const metricsRow = (id: string, impressionCount: number): XTweetMetrics => {
  return {
    bookmarkCount: 1,
    id,
    impressionCount,
    likeCount: 12,
    quoteCount: 0,
    replyCount: 3,
    retweetCount: 2,
  };
};

const posted = (
  postedTweetIds: readonly string[],
  extra: Record<string, unknown> = {},
) => {
  return {
    kind: 'single',
    postOn: '2026-11-30',
    postedTweetIds,
    text: 'hello',
    ...extra,
  };
};

describe('runXMetrics', () => {
  const createX = (rows: readonly XTweetMetrics[]) => {
    const getTweetMetrics = vi.fn<XClient['getTweetMetrics']>(async () => {
      return { ok: true, value: rows };
    });
    const client: XClient = {
      createTweet: vi.fn(),
      getTweetMetrics,
    };

    return { client, getTweetMetrics };
  };

  const run = (ot: OtClient, x: XClient, dryRun = false) => {
    return runXMetrics({
      dryRun,
      now: () => NOW,
      ot,
      planId: 'plan-1',
      redact: (text) => text,
      x: () => x,
    });
  };

  it('reads every due tweet in one call and records metrics plus a summary line', async () => {
    const ot = createOt([
      makeTask('a', '2026-11-30T15:00:00.000Z', posted(['t1'])),
      makeTask(
        'b',
        '2026-12-01T15:00:00.000Z',
        posted(['t2', 't3'], {
          kind: 'thread',
          text: undefined,
          tweets: ['one', 'two'],
        }),
      ),
    ]);
    const x = createX([metricsRow('t1', 1234), metricsRow('t2', 56)]);

    const result = await run(ot.client, x.client);

    expect(result.exitCode).toBe(0);
    expect(x.getTweetMetrics).toHaveBeenCalledTimes(1);
    expect(x.getTweetMetrics).toHaveBeenCalledWith(['t1', 't2']);
    const first = ot.updates.find((update) => update.id === 'a');
    const parsed = parseSocialPost(first?.requirements ?? '');

    expect(parsed.ok && parsed.value.metrics).toEqual({
      bookmarkCount: 1,
      impressionCount: 1234,
      likeCount: 12,
      quoteCount: 0,
      recordedAt: NOW.toISOString(),
      replyCount: 3,
      retweetCount: 2,
    });
    expect(first?.summary).toBe(
      'Posted 1 tweet(s): https://x.com/i/web/status/a\nMetrics 2026-12-02: 1,234 views · 12 likes · 3 replies · 2 reposts · 0 quotes · 1 bookmarks',
    );
  });

  it('skips tasks completed less than a day ago, already measured, or not completed', async () => {
    const ot = createOt([
      makeTask('fresh', '2026-12-02T00:00:00.000Z', posted(['t1'])),
      makeTask(
        'measured',
        '2026-11-30T15:00:00.000Z',
        posted(['t2'], {
          metrics: {
            bookmarkCount: 0,
            impressionCount: 9,
            likeCount: 0,
            quoteCount: 0,
            recordedAt: '2026-12-01T15:00:00.000Z',
            replyCount: 0,
            retweetCount: 0,
          },
        }),
      ),
      makeTask(
        'blocked',
        '2026-11-30T15:00:00.000Z',
        posted(['t3']),
        'BLOCKED',
      ),
      makeTask('by-hand', '2026-11-30T15:00:00.000Z', posted([])),
    ]);
    const x = createX([]);

    const result = await run(ot.client, x.client);

    expect(result.lines).toEqual([
      'x-metrics: no posted tweet is due for metrics.',
    ]);
    expect(x.getTweetMetrics).not.toHaveBeenCalled();
    expect(ot.updates).toEqual([]);
  });

  it('dry run lists the reads and calls nothing', async () => {
    const ot = createOt([
      makeTask('a', '2026-11-30T15:00:00.000Z', posted(['t1'])),
    ]);
    const x = createX([]);

    const result = await run(ot.client, x.client, true);

    expect(result.lines[0]).toContain('DRY RUN');
    expect(x.getTweetMetrics).not.toHaveBeenCalled();
    expect(ot.updates).toEqual([]);
  });

  it('fails when X refuses the read and writes nothing', async () => {
    const ot = createOt([
      makeTask('a', '2026-11-30T15:00:00.000Z', posted(['t1'])),
    ]);
    const client: XClient = {
      createTweet: vi.fn(),
      getTweetMetrics: async () => {
        return {
          error: { kind: 'credits', message: 'CreditsDepleted', status: 402 },
          ok: false,
        };
      },
    };

    const result = await run(ot.client, client);

    expect(result.exitCode).toBe(1);
    expect(ot.updates).toEqual([]);
  });

  it('notes a tweet X no longer returns and leaves its task alone', async () => {
    const ot = createOt([
      makeTask('a', '2026-11-30T15:00:00.000Z', posted(['t1'])),
    ]);
    const x = createX([]);

    const result = await run(ot.client, x.client);

    expect(result.exitCode).toBe(0);
    expect(result.lines[0]).toContain('may be deleted');
    expect(ot.updates).toEqual([]);
  });
});
