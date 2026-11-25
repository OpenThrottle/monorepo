import { EXIT_CODES } from '../config/exit-codes.ts';
import type { SocialPost, SocialPostMetrics } from '../types/social-post.ts';
import type { OtClient, OtTask } from './createOtClient.ts';
import type { XClient, XTweetMetrics } from './createXClient.ts';
import { parseSocialPost, serializeSocialPost } from './parseSocialPost.ts';

/** @description Read views this long after a post, in milliseconds: X's counts settle in a day. */
const METRICS_DELAY_MS = 24 * 60 * 60 * 1000;

/** @description `GET /2/tweets` takes at most 100 ids per call. */
const MAX_IDS_PER_READ = 100;

/** @description What {@link runXMetrics} needs; every side effect is injected. */
export interface RunXMetricsOptions {
  readonly dryRun: boolean;
  readonly now: () => Date;
  readonly ot: OtClient;
  readonly planId: string;
  readonly redact: (text: string) => string;
  /** @description Built only when a read is really made, so a dry run never touches X. */
  readonly x: () => XClient;
}

/** @description How the run ended, and what it says in the job log. */
export interface RunXMetricsResult {
  readonly exitCode: (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
  readonly lines: readonly string[];
}

interface Due {
  readonly firstId: string;
  readonly post: SocialPost;
  readonly task: OtTask;
}

const formatCount = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

const formatMetricsLine = (metrics: SocialPostMetrics): string => {
  const day = metrics.recordedAt.slice(0, 10);

  return `Metrics ${day}: ${formatCount(metrics.impressionCount)} views · ${formatCount(metrics.likeCount)} likes · ${formatCount(metrics.replyCount)} replies · ${formatCount(metrics.retweetCount)} reposts · ${formatCount(metrics.quoteCount)} quotes · ${formatCount(metrics.bookmarkCount)} bookmarks`;
};

const toMetrics = (
  row: XTweetMetrics,
  recordedAt: string,
): SocialPostMetrics => {
  return {
    bookmarkCount: row.bookmarkCount,
    impressionCount: row.impressionCount,
    likeCount: row.likeCount,
    quoteCount: row.quoteCount,
    recordedAt,
    replyCount: row.replyCount,
    retweetCount: row.retweetCount,
  };
};

const findDue = (tasks: readonly OtTask[], now: Date): Due[] => {
  const cutoff = now.getTime() - METRICS_DELAY_MS;

  return tasks.flatMap((task) => {
    const completedAt = Date.parse(task.completedAt ?? '');
    const isOldEnough = task.status === 'COMPLETED' && completedAt <= cutoff;
    const parsed = isOldEnough
      ? parseSocialPost(task.requirementsJson)
      : undefined;

    if (
      parsed === undefined ||
      !parsed.ok ||
      parsed.value.metrics !== undefined
    ) {
      return [];
    }

    const [firstId] = parsed.value.postedTweetIds;

    return firstId === undefined ? [] : [{ firstId, post: parsed.value, task }];
  });
};

/**
 * @description The daily metrics step, run after the poster. For every tweet task `COMPLETED` a
 * day or more ago with no metrics yet, it reads the first tweet's public counts and its
 * owner-only `impression_count` in one batched `GET /2/tweets` call, then writes them into the
 * payload's `metrics` and adds a one-line summary. A thread's views are its first tweet's.
 * Idempotent: a task with metrics is never read again.
 * @public
 */
export const runXMetrics = async (
  options: RunXMetricsOptions,
): Promise<RunXMetricsResult> => {
  const { ot, redact } = options;
  const lines: string[] = [];
  const say = (line: string): void => {
    lines.push(redact(line));
  };
  const tasks = await ot.listTasks(options.planId);

  if (!tasks.ok) {
    say(`x-metrics: could not list the plan's tasks: ${tasks.error}`);

    return { exitCode: EXIT_CODES.failed, lines };
  }

  const now = options.now();
  const due = findDue(tasks.value, now).slice(0, MAX_IDS_PER_READ);

  if (due.length === 0) {
    say('x-metrics: no posted tweet is due for metrics.');

    return { exitCode: EXIT_CODES.ok, lines };
  }

  if (options.dryRun) {
    say(`x-metrics: DRY RUN: would read ${due.length} tweet(s) in one call:`);
    due.forEach(({ firstId, task }) => {
      say(`  ${firstId} for "${task.title}" (${task.id})`);
    });

    return { exitCode: EXIT_CODES.ok, lines };
  }

  const read = await options
    .x()
    .getTweetMetrics(due.map((item) => item.firstId));

  if (!read.ok) {
    say(
      `x-metrics: X refused the read (${read.error.kind}): ${read.error.message}`,
    );

    return { exitCode: EXIT_CODES.failed, lines };
  }

  const byId = new Map(read.value.map((row) => [row.id, row]));
  const recordedAt = now.toISOString();
  const writes = due.map(async ({ firstId, post, task }) => {
    const row = byId.get(firstId);

    if (row === undefined) {
      return `x-metrics: X returned nothing for ${firstId} ("${task.title}"); it may be deleted.`;
    }

    const metrics = toMetrics(row, recordedAt);
    const line = formatMetricsLine(metrics);
    const summary = [task.summary, line].filter(Boolean).join('\n');
    const updated = await ot.updateTask({
      id: task.id,
      requirements: serializeSocialPost({ ...post, metrics }),
      status: undefined,
      summary,
    });

    return updated.ok
      ? `x-metrics: "${task.title}": ${line}`
      : `x-metrics: could not record metrics on "${task.title}": ${updated.error}`;
  });
  const results = await Promise.all(writes);

  results.forEach(say);

  const isFailed = results.some((line) => line.includes('could not record'));

  return { exitCode: isFailed ? EXIT_CODES.failed : EXIT_CODES.ok, lines };
};
