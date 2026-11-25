import { describe, expect, it } from 'vitest';

import {
  parseSocialPost,
  parseSocialPostValue,
  serializeSocialPost,
} from '../parseSocialPost.ts';

const wrap = (value: unknown): string => {
  return JSON.stringify([value]);
};

describe('parseSocialPost', () => {
  describe('single', () => {
    it('parses a minimal single and fills the defaults', () => {
      const result = parseSocialPost(
        wrap({ kind: 'single', postOn: '2026-11-30', text: 'Hello, X.' }),
      );

      expect(result).toEqual({
        ok: true,
        value: {
          firstReply: undefined,
          kind: 'single',
          media: undefined,
          metrics: undefined,
          postOn: '2026-11-30',
          postedTweetIds: [],
          text: 'Hello, X.',
        },
      });
    });

    it('accepts exactly 280 characters', () => {
      const result = parseSocialPost(
        wrap({ kind: 'single', postOn: '2026-11-30', text: 'a'.repeat(280) }),
      );

      expect(result.ok).toBe(true);
    });

    it('rejects 281 characters with the field and index', () => {
      const result = parseSocialPost(
        wrap({ kind: 'single', postOn: '2026-11-30', text: 'a'.repeat(281) }),
      );

      expect(result).toEqual({
        error: {
          field: 'text',
          index: 0,
          kind: 'too-long',
          length: 281,
          max: 280,
        },
        ok: false,
      });
    });

    it('counts a long URL as 23, so the post fits', () => {
      const text = `${'a'.repeat(256)} https://github.com/openthrottle/monorepo/pull/978`;
      const result = parseSocialPost(
        wrap({ kind: 'single', postOn: '2026-11-30', text }),
      );

      expect(result.ok).toBe(true);
    });

    it('counts emoji as 2, so 140 emoji fit and 141 do not', () => {
      const fits = parseSocialPost(
        wrap({ kind: 'single', postOn: '2026-11-30', text: '🚀'.repeat(140) }),
      );
      const over = parseSocialPost(
        wrap({ kind: 'single', postOn: '2026-11-30', text: '🚀'.repeat(141) }),
      );

      expect(fits.ok).toBe(true);
      expect(over.ok).toBe(false);
    });

    it('rejects an over-length first reply', () => {
      const result = parseSocialPost(
        wrap({
          firstReply: 'b'.repeat(300),
          kind: 'single',
          postOn: '2026-11-30',
          text: 'ok',
        }),
      );

      expect(result.ok === false && result.error).toMatchObject({
        field: 'firstReply',
        index: 0,
        kind: 'too-long',
      });
    });
  });

  describe('thread', () => {
    it('parses a thread', () => {
      const result = parseSocialPost(
        wrap({ kind: 'thread', postOn: '2026-12-01', tweets: ['one', 'two'] }),
      );

      expect(result.ok && result.value.kind).toBe('thread');
    });

    it('names the offending tweet index', () => {
      const result = parseSocialPost(
        wrap({
          kind: 'thread',
          postOn: '2026-12-01',
          tweets: ['one', 'two', 'x'.repeat(281)],
        }),
      );

      expect(result.ok === false && result.error).toMatchObject({
        field: 'tweets',
        index: 2,
        kind: 'too-long',
      });
    });

    it('rejects a one-tweet thread', () => {
      const result = parseSocialPost(
        wrap({ kind: 'thread', postOn: '2026-12-01', tweets: ['one'] }),
      );

      expect(result.ok === false && result.error.kind).toBe('invalid-shape');
    });
  });

  describe('poll', () => {
    const poll = {
      durationMinutes: 1440,
      kind: 'poll',
      options: ['Yes', 'No'],
      postOn: '2026-12-05',
      text: 'Would you?',
    };

    it('parses a poll', () => {
      const result = parseSocialPost(wrap(poll));

      expect(result.ok && result.value).toMatchObject({
        durationMinutes: 1440,
        kind: 'poll',
        options: ['Yes', 'No'],
      });
    });

    it('rejects one option and five options', () => {
      const one = parseSocialPost(wrap({ ...poll, options: ['Yes'] }));
      const five = parseSocialPost(
        wrap({ ...poll, options: ['a', 'b', 'c', 'd', 'e'] }),
      );

      expect(one.ok === false && one.error).toMatchObject({ path: 'options' });
      expect(five.ok === false && five.error).toMatchObject({
        path: 'options',
      });
    });

    it('rejects an option over 25 characters', () => {
      const result = parseSocialPost(
        wrap({ ...poll, options: ['Yes', 'n'.repeat(26)] }),
      );

      expect(result.ok === false && result.error).toMatchObject({
        path: 'options[1]',
      });
    });

    it('rejects a duration outside 5 to 10080 minutes', () => {
      const short = parseSocialPost(wrap({ ...poll, durationMinutes: 4 }));
      const long = parseSocialPost(wrap({ ...poll, durationMinutes: 10_081 }));

      expect(short.ok).toBe(false);
      expect(long.ok).toBe(false);
    });
  });

  describe('invalid payloads', () => {
    it('reports bad JSON without throwing', () => {
      const result = parseSocialPost('{not json');

      expect(result.ok === false && result.error.kind).toBe('invalid-json');
    });

    it('requires an array of exactly one post', () => {
      expect(parseSocialPost('[]').ok).toBe(false);
      expect(parseSocialPost('["a criterion", "another"]').ok).toBe(false);
      expect(parseSocialPost('{"kind":"single"}').ok).toBe(false);
    });

    it('rejects an unknown kind', () => {
      const result = parseSocialPost(
        wrap({ kind: 'reel', postOn: '2026-11-30', text: 'x' }),
      );

      expect(result.ok === false && result.error).toMatchObject({
        path: 'kind',
      });
    });

    it('rejects an impossible date', () => {
      const result = parseSocialPost(
        wrap({ kind: 'single', postOn: '2026-02-30', text: 'x' }),
      );

      expect(result.ok === false && result.error).toMatchObject({
        path: 'postOn',
      });
    });

    it('rejects malformed metrics', () => {
      const result = parseSocialPostValue({
        kind: 'single',
        metrics: { impressionCount: -1 },
        postOn: '2026-11-30',
        text: 'x',
      });

      expect(result.ok).toBe(false);
    });
  });

  it('round-trips through serializeSocialPost', () => {
    const parsed = parseSocialPost(
      wrap({
        firstReply: 'https://openthrottle.ai',
        kind: 'single',
        metrics: {
          bookmarkCount: 0,
          impressionCount: 120,
          likeCount: 3,
          quoteCount: 0,
          recordedAt: '2026-12-01T15:00:00.000Z',
          replyCount: 1,
          retweetCount: 0,
        },
        postOn: '2026-11-30',
        postedTweetIds: ['1', '2'],
        text: 'Hello',
      }),
    );

    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parseSocialPost(serializeSocialPost(parsed.value))).toEqual(
        parsed,
      );
    }
  });
});
