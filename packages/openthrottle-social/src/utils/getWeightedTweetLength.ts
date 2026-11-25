import {
  LIGHT_CODE_POINT_RANGES,
  TWEET_URL_WEIGHT,
} from '../config/social-post.ts';

/**
 * @description URLs X auto-links: anything with a scheme, plus bare domains on
 * the TLDs our posts use. A bare domain on another TLD is counted by its
 * characters, which over-counts and so never lets a too-long post through.
 */
const URL_PATTERN =
  /https?:\/\/\S+|\b(?:[a-z0-9-]+\.)+(?:ai|app|co|com|dev|io|net|org|sh)\b(?:\/\S*)?/giu;

/** @description Punctuation X leaves outside a URL when it ends one. */
const TRAILING_URL_PUNCTUATION = /[.,!?:;)\]'"]+$/u;

const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

const getCodePointWeight = (codePoint: number): number => {
  const isLight = LIGHT_CODE_POINT_RANGES.some(([start, end]) => {
    return codePoint >= start && codePoint <= end;
  });

  return isLight ? 1 : 2;
};

const getPlainTextWeight = (text: string): number => {
  let weight = 0;

  for (const { segment } of segmenter.segment(text)) {
    if (EMOJI_PATTERN.test(segment)) {
      weight += 2;
      continue;
    }

    for (const character of segment) {
      weight += getCodePointWeight(character.codePointAt(0) ?? 0);
    }
  }

  return weight;
};

/**
 * @description A tweet's length as X counts it against the 280 limit: the
 * text is NFC-normalized, each URL costs 23, each emoji (a whole sequence,
 * skin tone and ZWJ joins included) costs 2, CJK costs 2 and everything else
 * costs 1. Mirrors twitter-text v3 closely enough to gate drafts.
 * @public
 */
export const getWeightedTweetLength = (text: string): number => {
  const normalized = text.normalize('NFC');
  let weight = 0;
  let cursor = 0;

  for (const match of normalized.matchAll(URL_PATTERN)) {
    const start = match.index;
    const trailing = TRAILING_URL_PUNCTUATION.exec(match[0])?.[0] ?? '';
    const url = match[0].slice(0, match[0].length - trailing.length);

    weight += getPlainTextWeight(normalized.slice(cursor, start));
    weight += url.length > 0 ? TWEET_URL_WEIGHT : 0;
    weight += getPlainTextWeight(trailing);
    cursor = start + match[0].length;
  }

  weight += getPlainTextWeight(normalized.slice(cursor));

  return weight;
};
