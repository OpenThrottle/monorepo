import { describe, expect, it, vi } from 'vitest';

import { createXClient } from '../createXClient.ts';
import type { FetchLike } from '../x-oauth.ts';

const token = vi.fn(async () => {
  return { ok: true as const, value: 'access-1' };
});

describe('createXClient', () => {
  describe('createTweet', () => {
    it('sends text, the reply target and the poll in X’s field names', async () => {
      const fetch = vi.fn<FetchLike>(async () => {
        return new Response(
          JSON.stringify({ data: { id: '42', text: 'hi' } }),
          {
            status: 201,
          },
        );
      });
      const client = createXClient({ fetch, getAccessToken: token });

      const result = await client.createTweet({
        poll: { durationMinutes: 60, options: ['a', 'b'] },
        replyToId: '41',
        text: 'hi',
      });

      expect(result).toEqual({ ok: true, value: { id: '42' } });
      expect(fetch.mock.calls[0]?.[0]).toBe('https://api.x.com/2/tweets');
      expect(JSON.parse(String(fetch.mock.calls[0]?.[1].body))).toEqual({
        poll: { duration_minutes: 60, options: ['a', 'b'] },
        reply: { in_reply_to_tweet_id: '41' },
        text: 'hi',
      });
      expect(
        new Headers(fetch.mock.calls[0]?.[1].headers).get('Authorization'),
      ).toBe('Bearer access-1');
    });

    it('omits reply and poll for a plain tweet', async () => {
      const fetch = vi.fn<FetchLike>(async () => {
        return new Response(JSON.stringify({ data: { id: '1' } }));
      });
      const client = createXClient({ fetch, getAccessToken: token });

      await client.createTweet({
        poll: undefined,
        replyToId: undefined,
        text: 'plain',
      });

      expect(JSON.parse(String(fetch.mock.calls[0]?.[1].body))).toEqual({
        text: 'plain',
      });
    });

    it.each([
      [401, 'auth'],
      [402, 'credits'],
      [403, 'forbidden'],
      [429, 'rate-limit'],
      [503, 'http'],
    ])('maps HTTP %i to %s', async (status, kind) => {
      const fetch = vi.fn<FetchLike>(async () => {
        return new Response('{"title":"nope"}', { status });
      });
      const client = createXClient({ fetch, getAccessToken: token });

      const result = await client.createTweet({
        poll: undefined,
        replyToId: undefined,
        text: 'x',
      });

      expect(!result.ok && result.error.kind).toBe(kind);
    });

    it('reports a token failure without calling X', async () => {
      const fetch = vi.fn<FetchLike>();
      const client = createXClient({
        fetch,
        getAccessToken: async () => {
          return {
            error: { kind: 'missing-config', message: 'no refresh token' },
            ok: false,
          };
        },
      });

      const result = await client.createTweet({
        poll: undefined,
        replyToId: undefined,
        text: 'x',
      });

      expect(!result.ok && result.error.kind).toBe('token');
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('getTweetMetrics', () => {
    it('asks for both metric sets in one call and reads the owner-only impressions', async () => {
      const fetch = vi.fn<FetchLike>(async () => {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 't1',
                non_public_metrics: { impression_count: 900 },
                public_metrics: {
                  bookmark_count: 1,
                  impression_count: 850,
                  like_count: 5,
                  quote_count: 0,
                  reply_count: 2,
                  retweet_count: 3,
                },
              },
            ],
          }),
        );
      });
      const client = createXClient({ fetch, getAccessToken: token });

      const result = await client.getTweetMetrics(['t1', 't2']);

      const url = new URL(String(fetch.mock.calls[0]?.[0]));
      expect(url.pathname).toBe('/2/tweets');
      expect(url.searchParams.get('ids')).toBe('t1,t2');
      expect(url.searchParams.get('tweet.fields')).toBe(
        'public_metrics,non_public_metrics',
      );
      expect(result).toEqual({
        ok: true,
        value: [
          {
            bookmarkCount: 1,
            id: 't1',
            impressionCount: 900,
            likeCount: 5,
            quoteCount: 0,
            replyCount: 2,
            retweetCount: 3,
          },
        ],
      });
    });
  });
});
