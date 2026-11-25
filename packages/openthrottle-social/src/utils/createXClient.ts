import { isRecord, toErrorMessage } from '@openthrottle/nodejs-utils';

import { X_API_BASE_URL } from '../config/x-api.ts';
import type { Result } from '../types/social-post.ts';
import type { XTokenClientError } from './createXTokenClient.ts';
import type { FetchLike } from './x-oauth.ts';

/** @description One tweet to send. */
export interface XTweetRequest {
  readonly poll:
    | { readonly durationMinutes: number; readonly options: readonly string[] }
    | undefined;
  readonly replyToId: string | undefined;
  readonly text: string;
}

/**
 * @description Why X refused a call. The kinds are the `BLOCKED` reasons the runbook explains:
 * `credits` (402: the pay-per-use balance ran out), `auth` (401, or the token refresh failed),
 * `rate-limit` (429), `forbidden` (403: often a duplicate post), anything else `http`.
 * @public
 */
export type XApiError =
  | {
      readonly kind: 'auth' | 'credits' | 'forbidden' | 'http' | 'rate-limit';
      readonly message: string;
      readonly status: number;
    }
  | { readonly kind: 'invalid-response'; readonly message: string }
  | { readonly kind: 'network'; readonly message: string }
  | {
      readonly kind: 'token';
      readonly message: string;
      readonly tokenError: XTokenClientError['kind'];
    };

/** @description The X API calls the social scripts make. */
export interface XClient {
  readonly createTweet: (
    tweet: XTweetRequest,
  ) => Promise<Result<{ readonly id: string }, XApiError>>;
  readonly getTweetMetrics: (
    ids: readonly string[],
  ) => Promise<Result<readonly XTweetMetrics[], XApiError>>;
}

/** @description A posted tweet's counts, as `GET /2/tweets` reports them for the owner. */
export interface XTweetMetrics {
  readonly bookmarkCount: number;
  readonly id: string;
  readonly impressionCount: number;
  readonly likeCount: number;
  readonly quoteCount: number;
  readonly replyCount: number;
  readonly retweetCount: number;
}

const kindForStatus = (
  status: number,
): 'auth' | 'credits' | 'forbidden' | 'http' | 'rate-limit' => {
  if (status === 401) {
    return 'auth';
  }

  if (status === 402) {
    return 'credits';
  }

  if (status === 403) {
    return 'forbidden';
  }

  return status === 429 ? 'rate-limit' : 'http';
};

const count = (
  record: Readonly<Record<string, unknown>> | undefined,
  key: string,
): number => {
  const value = record?.[key];

  return typeof value === 'number' ? value : 0;
};

const readMetrics = (row: unknown): XTweetMetrics | undefined => {
  if (!isRecord(row) || typeof row['id'] !== 'string') {
    return undefined;
  }

  const publicMetrics = isRecord(row['public_metrics'])
    ? row['public_metrics']
    : undefined;
  const privateMetrics = isRecord(row['non_public_metrics'])
    ? row['non_public_metrics']
    : undefined;

  return {
    bookmarkCount: count(publicMetrics, 'bookmark_count'),
    id: row['id'],
    impressionCount:
      count(privateMetrics, 'impression_count') ||
      count(publicMetrics, 'impression_count'),
    likeCount: count(publicMetrics, 'like_count'),
    quoteCount: count(publicMetrics, 'quote_count'),
    replyCount: count(publicMetrics, 'reply_count'),
    retweetCount: count(publicMetrics, 'retweet_count'),
  };
};

/**
 * @description An {@link XClient} over the X API v2 with a user access token. The token is asked
 * for lazily, on the first real call, so a dry run never refreshes (and so never rotates) it.
 * @public
 */
export const createXClient = (options: {
  readonly fetch: FetchLike;
  readonly getAccessToken: () => Promise<Result<string, XTokenClientError>>;
}): XClient => {
  const call = async (
    path: string,
    init: {
      readonly body: string | undefined;
      readonly method: 'GET' | 'POST';
    },
  ): Promise<Result<unknown, XApiError>> => {
    const token = await options.getAccessToken();

    if (!token.ok) {
      return {
        error: {
          kind: 'token',
          message: token.error.message,
          tokenError: token.error.kind,
        },
        ok: false,
      };
    }

    let response: Response;

    try {
      response = await options.fetch(`${X_API_BASE_URL}${path}`, {
        ...(init.body === undefined ? {} : { body: init.body }),
        headers: {
          Authorization: `Bearer ${token.value}`,
          'Content-Type': 'application/json',
        },
        method: init.method,
      });
    } catch (error) {
      return {
        error: { kind: 'network', message: toErrorMessage(error) },
        ok: false,
      };
    }

    const text = await response.text();

    if (!response.ok) {
      return {
        error: {
          kind: kindForStatus(response.status),
          message: text.slice(0, 500),
          status: response.status,
        },
        ok: false,
      };
    }

    try {
      return { ok: true, value: JSON.parse(text) };
    } catch {
      return {
        error: { kind: 'invalid-response', message: 'X answered with no JSON' },
        ok: false,
      };
    }
  };

  return {
    createTweet: async (tweet) => {
      const reply = tweet.replyToId && {
        in_reply_to_tweet_id: tweet.replyToId,
      };
      const poll = tweet.poll && {
        duration_minutes: tweet.poll.durationMinutes,
        options: tweet.poll.options,
      };
      const body = { poll, reply, text: tweet.text };
      const result = await call('/tweets', {
        body: JSON.stringify(body),
        method: 'POST',
      });

      if (!result.ok) {
        return result;
      }

      const data = isRecord(result.value) ? result.value['data'] : undefined;
      const id = isRecord(data) ? data['id'] : undefined;

      if (typeof id !== 'string') {
        const message = 'X returned no tweet id';

        return { error: { kind: 'invalid-response', message }, ok: false };
      }

      return { ok: true, value: { id } };
    },
    getTweetMetrics: async (ids) => {
      const query = new URLSearchParams({
        ids: ids.join(','),
        'tweet.fields': 'public_metrics,non_public_metrics',
      });
      const result = await call(`/tweets?${query.toString()}`, {
        body: undefined,
        method: 'GET',
      });

      if (!result.ok) {
        return result;
      }

      const rows = isRecord(result.value) ? result.value['data'] : undefined;
      const metrics = (Array.isArray(rows) ? rows : [])
        .map((row) => readMetrics(row))
        .filter((row): row is XTweetMetrics => row !== undefined);

      return { ok: true, value: metrics };
    },
  };
};
