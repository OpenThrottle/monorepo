import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OtClient, OtTask, OtTaskUpdate } from '../createOtClient.ts';
import type { XApiError, XClient, XTweetRequest } from '../createXClient.ts';
import { parseSocialPost } from '../parseSocialPost.ts';
import { runXPost } from '../runXPost.ts';

// 15:00 UTC on 2026-11-30 is 07:00 in Los Angeles.
const NOW = new Date('2026-11-30T15:00:00.000Z');

const makeTask = (
  id: string,
  status: string,
  payload: Record<string, unknown>,
  sortOrder = 1000,
): OtTask => {
  return {
    completedAt: undefined,
    id,
    requirementsJson: JSON.stringify([payload]),
    sortOrder,
    status,
    summary: undefined,
    title: `Tweet ${id}`,
    updatedAt: undefined,
  };
};

const createFakeOt = (initial: readonly OtTask[]) => {
  const tasks = new Map(initial.map((task) => [task.id, task]));
  const updates: OtTaskUpdate[] = [];
  const outputs: string[] = [];
  let failRecordAfter: number | undefined;

  const client: OtClient = {
    appendOutput: async ({ content }) => {
      outputs.push(content);

      return { ok: true, value: undefined };
    },
    listTasks: async () => {
      return { ok: true, value: [...tasks.values()] };
    },
    updateTask: async (update) => {
      const isRecord = update.requirements !== undefined;

      if (isRecord && failRecordAfter !== undefined) {
        if (failRecordAfter === 0) {
          return { error: 'OpenThrottle unreachable', ok: false };
        }

        failRecordAfter -= 1;
      }

      updates.push(update);
      const current = tasks.get(update.id);

      if (current === undefined) {
        return { error: 'not found', ok: false };
      }

      const next: OtTask = {
        ...current,
        requirementsJson: update.requirements ?? current.requirementsJson,
        status: update.status ?? current.status,
        summary: update.summary ?? current.summary,
      };

      tasks.set(update.id, next);

      return { ok: true, value: next };
    },
  };

  return {
    client,
    failRecordingAfter: (count: number) => {
      failRecordAfter = count;
    },
    outputs,
    task: (id: string) => tasks.get(id),
    updates,
  };
};

const createFakeX = () => {
  const sent: XTweetRequest[] = [];
  const failures = new Map<number, XApiError>();
  let next = 100;

  const client: XClient = {
    createTweet: async (tweet) => {
      const failure = failures.get(sent.length);

      sent.push(tweet);

      if (failure !== undefined) {
        return { error: failure, ok: false };
      }

      next += 1;

      return { ok: true, value: { id: `t${next}` } };
    },
    getTweetMetrics: async () => {
      return { ok: true, value: [] };
    },
  };

  return {
    client,
    failOnCall: (call: number, error: XApiError) => {
      failures.set(call, error);
    },
    sent,
  };
};

const postedIds = (task: OtTask | undefined): readonly string[] => {
  const parsed = parseSocialPost(task?.requirementsJson ?? '');

  return parsed.ok ? parsed.value.postedTweetIds : [];
};

describe('runXPost', () => {
  let x: ReturnType<typeof createFakeX>;
  let makeX: ReturnType<typeof vi.fn<() => XClient>>;

  beforeEach(() => {
    x = createFakeX();
    makeX = vi.fn(() => x.client);
  });

  const run = (ot: OtClient, dryRun = false, now = NOW) => {
    return runXPost({
      dryRun,
      now: () => now,
      ot,
      planId: 'plan-1',
      redact: (text) => text.replaceAll('secret-token-123', '[redacted]'),
      x: makeX,
    });
  };

  describe('choosing the task', () => {
    it('exits 0 with nothing to post when no PENDING task is dated today', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          kind: 'single',
          postOn: '2026-12-01',
          text: 'tomorrow',
        }),
        makeTask('b', 'BACKLOG', {
          kind: 'single',
          postOn: '2026-11-30',
          text: 'not approved',
        }),
        makeTask('c', 'COMPLETED', {
          kind: 'single',
          postOn: '2026-11-30',
          text: 'done',
        }),
      ]);

      const result = await run(ot.client);

      expect(result.exitCode).toBe(0);
      expect(result.lines).toContain('x-post: nothing to post for 2026-11-30.');
      expect(makeX).not.toHaveBeenCalled();
      expect(ot.updates).toEqual([]);
    });

    it('reads today in Los Angeles, not UTC', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          kind: 'single',
          postOn: '2026-11-30',
          text: 'hello',
        }),
      ]);

      // 06:00 UTC on Dec 1 is still Nov 30 in Los Angeles.
      const result = await run(
        ot.client,
        false,
        new Date('2026-12-01T06:00:00.000Z'),
      );

      expect(result.exitCode).toBe(0);
      expect(x.sent).toHaveLength(1);
    });

    it('posts only the lowest-sortOrder task when two are due, and says so', async () => {
      const ot = createFakeOt([
        makeTask(
          'late',
          'PENDING',
          { kind: 'single', postOn: '2026-11-30', text: 'second' },
          2000,
        ),
        makeTask(
          'early',
          'PENDING',
          { kind: 'single', postOn: '2026-11-30', text: 'first' },
          1000,
        ),
      ]);

      const result = await run(ot.client);

      expect(x.sent.map((tweet) => tweet.text)).toEqual(['first']);
      expect(ot.task('late')?.status).toBe('PENDING');
      expect(result.lines.some((line) => line.includes('also due'))).toBe(true);
    });
  });

  describe('posting', () => {
    it('posts a single, records the id, and completes the task with its URL', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          kind: 'single',
          postOn: '2026-11-30',
          text: 'hello',
        }),
      ]);

      const result = await run(ot.client);

      expect(result.exitCode).toBe(0);
      expect(x.sent).toEqual([
        { poll: undefined, replyToId: undefined, text: 'hello' },
      ]);
      expect(ot.updates.map((update) => update.status)).toEqual([
        'IN_PROGRESS',
        undefined,
        'COMPLETED',
      ]);
      expect(ot.task('a')?.status).toBe('COMPLETED');
      expect(ot.task('a')?.summary).toContain(
        'https://x.com/i/web/status/t101',
      );
      expect(postedIds(ot.task('a'))).toEqual(['t101']);
    });

    it('chains a thread and its first reply', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          firstReply: 'link: https://openthrottle.ai',
          kind: 'thread',
          postOn: '2026-11-30',
          tweets: ['one', 'two', 'three'],
        }),
      ]);

      await run(ot.client);

      expect(x.sent.map((tweet) => [tweet.text, tweet.replyToId])).toEqual([
        ['one', undefined],
        ['two', 't101'],
        ['three', 't102'],
        ['link: https://openthrottle.ai', 't103'],
      ]);
      expect(postedIds(ot.task('a'))).toEqual(['t101', 't102', 't103', 't104']);
    });

    it('sends a poll with its options and duration', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          durationMinutes: 1440,
          kind: 'poll',
          options: ['Yes', 'No'],
          postOn: '2026-11-30',
          text: 'Would you?',
        }),
      ]);

      await run(ot.client);

      expect(x.sent[0]?.poll).toEqual({
        durationMinutes: 1440,
        options: ['Yes', 'No'],
      });
    });
  });

  describe('never double-posts', () => {
    it('resumes an IN_PROGRESS thread after its last posted tweet', async () => {
      const ot = createFakeOt([
        makeTask('a', 'IN_PROGRESS', {
          kind: 'thread',
          postOn: '2026-11-30',
          postedTweetIds: ['t050'],
          tweets: ['one', 'two', 'three'],
        }),
      ]);

      const result = await run(ot.client);

      expect(result.exitCode).toBe(0);
      expect(x.sent.map((tweet) => [tweet.text, tweet.replyToId])).toEqual([
        ['two', 't050'],
        ['three', 't101'],
      ]);
      expect(postedIds(ot.task('a'))).toEqual(['t050', 't101', 't102']);
      expect(ot.updates[0]?.status).toBe(undefined);
    });

    it('resumes yesterday’s IN_PROGRESS task before today’s PENDING one', async () => {
      const ot = createFakeOt([
        makeTask(
          'today',
          'PENDING',
          { kind: 'single', postOn: '2026-11-30', text: 'today' },
          2000,
        ),
        makeTask('stuck', 'IN_PROGRESS', {
          kind: 'thread',
          postOn: '2026-11-29',
          postedTweetIds: ['t050'],
          tweets: ['one', 'two'],
        }),
      ]);

      await run(ot.client);

      expect(x.sent.map((tweet) => tweet.text)).toEqual(['two']);
      expect(ot.task('today')?.status).toBe('PENDING');
    });

    it('completes a task whose every tweet is already recorded without posting', async () => {
      const ot = createFakeOt([
        makeTask('a', 'IN_PROGRESS', {
          kind: 'single',
          postOn: '2026-11-30',
          postedTweetIds: ['t050'],
          text: 'hello',
        }),
      ]);

      await run(ot.client);

      expect(x.sent).toEqual([]);
      expect(ot.task('a')?.status).toBe('COMPLETED');
    });

    it('blocks mid-thread on an X error, keeps the posted ids, and a retry posts only the rest', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          kind: 'thread',
          postOn: '2026-11-30',
          tweets: ['one', 'two', 'three'],
        }),
      ]);

      x.failOnCall(1, {
        kind: 'credits',
        message: 'CreditsDepleted',
        status: 402,
      });
      const first = await run(ot.client);

      expect(first.exitCode).toBe(1);
      expect(ot.task('a')?.status).toBe('BLOCKED');
      expect(ot.task('a')?.summary).toMatch(/^BLOCKED credits/);
      expect(ot.task('a')?.summary).toContain('t101');
      expect(postedIds(ot.task('a'))).toEqual(['t101']);

      // The human tops up credits and sets the task back to PENDING.
      await ot.client.updateTask({
        id: 'a',
        requirements: undefined,
        status: 'PENDING',
        summary: undefined,
      });
      const retryX = createFakeX();

      makeX.mockReturnValue(retryX.client);
      await run(ot.client);

      expect(retryX.sent.map((tweet) => [tweet.text, tweet.replyToId])).toEqual(
        [
          ['two', 't101'],
          ['three', 't101'],
        ],
      );
      expect(ot.task('a')?.status).toBe('COMPLETED');
    });

    it('stops and says so when a posted id cannot be recorded', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          kind: 'thread',
          postOn: '2026-11-30',
          tweets: ['one', 'two'],
        }),
      ]);

      ot.failRecordingAfter(0);
      const result = await run(ot.client);

      expect(result.exitCode).toBe(1);
      expect(x.sent).toHaveLength(1);
      expect(
        result.lines.some((line) => line.includes('POSTED tweet t101')),
      ).toBe(true);
    });
  });

  describe('blocked reasons', () => {
    it.each([
      [
        { kind: 'auth', message: 'Unauthorized', status: 401 } as const,
        /^BLOCKED auth/,
      ],
      [
        {
          kind: 'rate-limit',
          message: 'Too Many Requests',
          status: 429,
        } as const,
        /^BLOCKED rate-limit/,
      ],
      [
        {
          kind: 'token',
          message: 'invalid_request',
          tokenError: 'auth',
        } as const,
        /^BLOCKED auth: the access token could not be refreshed/,
      ],
    ])('maps %o to a BLOCKED summary', async (error, summary) => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          kind: 'single',
          postOn: '2026-11-30',
          text: 'hello',
        }),
      ]);

      x.failOnCall(0, error);
      const result = await run(ot.client);

      expect(result.exitCode).toBe(1);
      expect(ot.task('a')?.summary).toMatch(summary);
    });

    it('redacts secrets from the summary and the log', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          kind: 'single',
          postOn: '2026-11-30',
          text: 'hello',
        }),
      ]);

      x.failOnCall(0, {
        kind: 'http',
        message: 'echo secret-token-123',
        status: 500,
      });
      const result = await run(ot.client);

      expect(ot.task('a')?.summary).not.toContain('secret-token-123');
      expect(result.lines.join('\n')).not.toContain('secret-token-123');
    });
  });

  describe('media', () => {
    it('leaves a media task PENDING for a human and notes it on the plan', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          kind: 'single',
          media: 'docs/assets/demo.gif',
          postOn: '2026-11-30',
          text: 'look',
        }),
      ]);

      const result = await run(ot.client);

      expect(result.exitCode).toBe(3);
      expect(ot.task('a')?.status).toBe('PENDING');
      expect(ot.outputs[0]).toContain('post it by hand');
      expect(makeX).not.toHaveBeenCalled();
    });
  });

  describe('--dry-run', () => {
    it('prints every tweet and touches neither OpenThrottle nor X', async () => {
      const ot = createFakeOt([
        makeTask('a', 'PENDING', {
          firstReply: 'more',
          kind: 'thread',
          postOn: '2026-11-30',
          tweets: ['one', 'two'],
        }),
      ]);

      const result = await run(ot.client, true);

      expect(result.exitCode).toBe(0);
      expect(makeX).not.toHaveBeenCalled();
      expect(ot.updates).toEqual([]);
      expect(ot.outputs).toEqual([]);
      expect(result.lines.join('\n')).toContain('DRY RUN');
      expect(result.lines.filter((line) => line.startsWith('     '))).toEqual([
        '     "one"',
        '     "two"',
        '     "more"',
      ]);
    });
  });
});
