import { EXIT_CODES, TWEET_URL_PREFIX } from '../config/exit-codes.ts';
import { SOCIAL_POST_TIME_ZONE } from '../config/social-post.ts';
import type { SocialPost } from '../types/social-post.ts';
import { buildTweetSequence } from './buildTweetSequence.ts';
import type { OtClient, OtTask } from './createOtClient.ts';
import type { XApiError, XClient } from './createXClient.ts';
import { getDateInTimeZone } from './getDateInTimeZone.ts';
import { getWeightedTweetLength } from './getWeightedTweetLength.ts';
import { parseSocialPost, serializeSocialPost } from './parseSocialPost.ts';

/** @description What {@link runXPost} needs; every side effect is injected. */
export interface RunXPostOptions {
  readonly dryRun: boolean;
  readonly now: () => Date;
  readonly ot: OtClient;
  readonly planId: string;
  /** @description Masks secrets in every line before it is printed or written to OpenThrottle. */
  readonly redact: (text: string) => string;
  /** @description Built only when a tweet is really sent, so a dry run never touches X or the token. */
  readonly x: () => XClient;
}

/** @description How the run ended, and what it says in the job log. */
export interface RunXPostResult {
  readonly exitCode: (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
  readonly lines: readonly string[];
}

interface Candidate {
  readonly post: SocialPost;
  readonly task: OtTask;
}

const describeXError = (error: XApiError): string => {
  const reasons: Record<XApiError['kind'], string> = {
    auth: 'auth: X refused the access token; re-run `pnpm run social:x-auth`',
    credits: `credits: the X API pay-per-use balance is empty; top it up in the developer portal`,
    forbidden: `forbidden: X refused this post (often a duplicate of an earlier one)`,
    http: 'http: X returned an error',
    'invalid-response': `invalid-response: X answered with something unexpected`,
    network: 'network: X could not be reached',
    'rate-limit': `rate-limit: X is rate limiting this app; set the task back to PENDING to retry`,
    token: `auth: the access token could not be refreshed; re-run \`pnpm run social:x-auth\``,
  };
  const status = 'status' in error ? ` (${error.status})` : '';

  return `${reasons[error.kind]}${status}: ${error.message}`;
};

const byOrder = (a: Candidate, b: Candidate): number => {
  return a.task.sortOrder - b.task.sortOrder;
};

const postCandidate = async (
  input: RunXPostOptions & {
    readonly candidate: Candidate;
    readonly lines: string[];
    readonly say: (line: string) => void;
    readonly today: string;
  },
): Promise<RunXPostResult> => {
  const { candidate, lines, ot, planId, say } = input;
  const { post, task } = candidate;
  const sequence = buildTweetSequence(post);
  const label = `"${task.title}" (${task.id})`;

  if (post.media !== undefined && post.postedTweetIds.length === 0) {
    const note = `x-post: ${label} has media (${post.media}); v1 does not upload media, so post it by hand and mark the task COMPLETED with its URL.`;

    say(note);

    if (!input.dryRun) {
      await ot.appendOutput({
        content: input.redact(note),
        planId,
        taskId: task.id,
      });
    }

    return { exitCode: EXIT_CODES.needsHuman, lines };
  }

  if (input.dryRun) {
    say(
      `x-post: DRY RUN for ${input.today}: would post ${label} (${post.kind}, ${sequence.length} tweet(s)).`,
    );
    sequence.forEach((tweet, index) => {
      const done =
        index < post.postedTweetIds.length ? ' [already posted]' : '';
      const reply = index === 0 ? 'new tweet' : `reply to tweet ${index}`;
      const poll =
        tweet.poll === undefined ? '' : ` poll=${JSON.stringify(tweet.poll)}`;

      say(
        `  ${index + 1}. ${tweet.role}, ${reply}, ${getWeightedTweetLength(tweet.text)}/280${poll}${done}`,
      );
      say(`     ${JSON.stringify(tweet.text)}`);
    });

    return { exitCode: EXIT_CODES.ok, lines };
  }

  const block = async (
    reason: string,
    ids: readonly string[],
  ): Promise<RunXPostResult> => {
    const posted = ids.length > 0 ? ` Already posted: ${ids.join(', ')}.` : '';
    const summary = input.redact(`BLOCKED ${reason}.${posted}`);
    const update = await ot.updateTask({
      id: task.id,
      requirements: undefined,
      status: 'BLOCKED',
      summary,
    });

    say(`x-post: ${label} ${summary}`);

    if (!update.ok) {
      say(`x-post: and the task could not be set BLOCKED: ${update.error}`);
    }

    return { exitCode: EXIT_CODES.failed, lines };
  };

  if (task.status !== 'IN_PROGRESS') {
    const started = await ot.updateTask({
      id: task.id,
      requirements: undefined,
      status: 'IN_PROGRESS',
      summary: undefined,
    });

    if (!started.ok) {
      say(
        `x-post: could not move ${label} to IN_PROGRESS, so nothing was posted: ${started.error}`,
      );

      return { exitCode: EXIT_CODES.failed, lines };
    }
  }

  const x = input.x();
  const ids = [...post.postedTweetIds];

  if (ids.length > 0) {
    say(`x-post: resuming ${label} after ${ids.length} posted tweet(s).`);
  }

  for (const [index, tweet] of sequence.entries()) {
    if (index < ids.length) {
      continue;
    }

    // Deliberately sequential: each tweet replies to the one before, and its id must be recorded
    // before the next is sent, or a crash in between would make a re-run post it twice.
    // eslint-disable-next-line no-await-in-loop -- see above
    const sent = await x.createTweet({
      poll: tweet.poll,
      replyToId: ids.at(-1),
      text: tweet.text,
    });

    if (!sent.ok) {
      return block(describeXError(sent.error), ids);
    }

    ids.push(sent.value.id);
    say(
      `x-post: posted ${tweet.role} ${index + 1}/${sequence.length}: ${TWEET_URL_PREFIX}${sent.value.id}`,
    );

    // eslint-disable-next-line no-await-in-loop -- the id is recorded before the next tweet goes out
    const recorded = await ot.updateTask({
      id: task.id,
      requirements: serializeSocialPost({ ...post, postedTweetIds: ids }),
      status: undefined,
      summary: undefined,
    });

    if (!recorded.ok) {
      say(
        `x-post: POSTED tweet ${sent.value.id} but could not record it on ${label} (${recorded.error}). Add it to postedTweetIds by hand before any re-run, or the re-run will post it again.`,
      );

      return { exitCode: EXIT_CODES.failed, lines };
    }
  }

  const [firstId] = ids;
  const summary = `Posted ${ids.length} tweet(s) on ${input.today}: ${TWEET_URL_PREFIX}${firstId ?? ''} (ids: ${ids.join(', ')})`;
  const completed = await ot.updateTask({
    id: task.id,
    requirements: undefined,
    status: 'COMPLETED',
    summary,
  });

  say(`x-post: ${label} ${summary}`);

  if (!completed.ok) {
    say(
      `x-post: the tweets are out but the task could not be set COMPLETED: ${completed.error}`,
    );

    return { exitCode: EXIT_CODES.failed, lines };
  }

  return { exitCode: EXIT_CODES.ok, lines };
};

/**
 * @description The daily poster. It sends at most one task's tweets per run:
 *
 * 1. An `IN_PROGRESS` task dated today or earlier is resumed first: a crash or an X error
 *    mid-thread left it there, and `postedTweetIds` says which tweets already went out.
 * 2. Otherwise the `PENDING` task whose `postOn` is today in America/Los_Angeles. None is a
 *    clean "nothing to post". Only a human moves a task to `PENDING`.
 * 3. A task with `media` is left `PENDING` for a person to post, with a note on the plan.
 *
 * Each tweet id is written back to the task the moment X returns it, before the next tweet is
 * sent, so a re-run never sends the same tweet twice. An X error sets the task `BLOCKED` with the
 * reason in its summary and keeps the ids already posted, so a human can fix the cause and set it
 * back to `PENDING` (with today's `postOn`) to finish the rest.
 * @public
 */
export const runXPost = async (
  options: RunXPostOptions,
): Promise<RunXPostResult> => {
  const { ot, planId, redact } = options;
  const lines: string[] = [];
  const say = (line: string): void => {
    lines.push(redact(line));
  };
  const today = getDateInTimeZone(options.now(), SOCIAL_POST_TIME_ZONE);
  const tasks = await ot.listTasks(planId);

  if (!tasks.ok) {
    say(`x-post: could not list the plan's tasks: ${tasks.error}`);

    return { exitCode: EXIT_CODES.failed, lines };
  }

  const candidates: Candidate[] = [];
  const invalid: { readonly reason: string; readonly task: OtTask }[] = [];

  for (const task of tasks.value) {
    if (task.status !== 'IN_PROGRESS' && task.status !== 'PENDING') {
      continue;
    }

    const parsed = parseSocialPost(task.requirementsJson);

    if (!parsed.ok) {
      invalid.push({ reason: JSON.stringify(parsed.error), task });
      continue;
    }

    const { postOn } = parsed.value;
    const isResumable = task.status === 'IN_PROGRESS';
    const isDue = isResumable ? postOn <= today : postOn === today;

    if (isDue) {
      candidates.push({ post: parsed.value, task });
    }
  }

  const resumable = candidates
    .filter((c) => c.task.status === 'IN_PROGRESS')
    .sort(byOrder);
  const pending = candidates
    .filter((c) => c.task.status === 'PENDING')
    .sort(byOrder);
  const chosen = resumable[0] ?? pending[0];

  invalid.forEach(({ reason, task }) => {
    say(
      `x-post: ignoring "${task.title}" (${task.id}): its payload does not parse: ${reason}`,
    );
  });

  if (chosen === undefined) {
    say(`x-post: nothing to post for ${today}.`);

    return { exitCode: EXIT_CODES.ok, lines };
  }

  const others = [...resumable, ...pending].filter((c) => c !== chosen);

  others.forEach(({ task }) => {
    say(
      `x-post: "${task.title}" (${task.id}) is also due; it waits for a later run.`,
    );
  });

  return postCandidate({ ...options, candidate: chosen, lines, say, today });
};
