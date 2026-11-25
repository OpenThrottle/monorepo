import { describe, expect, it } from 'vitest';

import { getWeightedTweetLength } from '../getWeightedTweetLength.ts';

describe('getWeightedTweetLength', () => {
  it('counts plain ASCII one per character', () => {
    expect(getWeightedTweetLength('hello world')).toBe(11);
  });

  it('counts a URL as 23 whatever its length', () => {
    const url = `https://github.com/openthrottle/monorepo/pull/978/files`;

    expect(getWeightedTweetLength(`see ${url}`)).toBe(4 + 23);
    expect(getWeightedTweetLength('https://x.co')).toBe(23);
  });

  it('counts a bare domain as a URL', () => {
    expect(getWeightedTweetLength('openthrottle.ai')).toBe(23);
  });

  it('leaves trailing punctuation outside the URL', () => {
    expect(getWeightedTweetLength('(https://openthrottle.ai).')).toBe(
      1 + 23 + 2,
    );
  });

  it('counts an emoji as 2', () => {
    expect(getWeightedTweetLength('🚀')).toBe(2);
  });

  it('counts a ZWJ sequence or skin-toned emoji as one emoji', () => {
    expect(getWeightedTweetLength('👩‍💻')).toBe(2);
    expect(getWeightedTweetLength('👍🏽')).toBe(2);
    expect(getWeightedTweetLength('🇺🇸')).toBe(2);
  });

  it('counts CJK as 2 per character', () => {
    expect(getWeightedTweetLength('日本')).toBe(4);
  });

  it('counts curly quotes and dashes as 1', () => {
    expect(getWeightedTweetLength('“a—b”')).toBe(5);
  });
});
