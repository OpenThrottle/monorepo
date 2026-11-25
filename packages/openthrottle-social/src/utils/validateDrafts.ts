import { toErrorMessage } from '@openthrottle/nodejs-utils';

import type { Result } from '../types/social-post.ts';
import { getWeightedTweetLength } from './getWeightedTweetLength.ts';
import { parseSocialPostValue } from './parseSocialPost.ts';

/** @description One line of the verdict on a batch of drafts. */
export interface DraftVerdict {
  readonly index: number;
  readonly line: string;
  readonly ok: boolean;
}

const describe = (value: unknown, index: number): DraftVerdict => {
  const parsed = parseSocialPostValue(value);

  if (!parsed.ok) {
    return {
      index,
      line: `draft ${index}: INVALID ${JSON.stringify(parsed.error)}`,
      ok: false,
    };
  }

  const post = parsed.value;
  const texts = post.kind === 'thread' ? post.tweets : [post.text];
  const lengths = texts.map((text) => getWeightedTweetLength(text)).join(',');

  return {
    index,
    line: `draft ${index}: ok ${post.kind} ${post.postOn} lengths=${lengths}`,
    ok: true,
  };
};

/**
 * @description Check a JSON array of draft payloads against the tweet-task contract, one verdict
 * per draft. The refill job runs this before it creates any task. Never throws.
 * @public
 */
export const validateDrafts = (
  json: string,
): Result<readonly DraftVerdict[], string> => {
  let decoded: unknown;

  try {
    decoded = JSON.parse(json);
  } catch (error) {
    return {
      error: `not JSON: ${toErrorMessage(error)}`,
      ok: false,
    };
  }

  if (!Array.isArray(decoded)) {
    return { error: 'expected a JSON array of draft payloads', ok: false };
  }

  return {
    ok: true,
    value: decoded.map((value, index) => describe(value, index)),
  };
};
