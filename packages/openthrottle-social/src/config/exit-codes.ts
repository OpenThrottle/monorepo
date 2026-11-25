/**
 * @description Exit codes the social scripts end with, so a scheduled-job log reads at a glance:
 * `ok` (posted, recorded, or nothing to do), `failed` (a task went `BLOCKED`, or OpenThrottle or X
 * could not be reached), `config` (an env key or argument is missing), `needsHuman` (a media post
 * waits for a person to post it by hand).
 */
export const EXIT_CODES = {
  config: 2,
  failed: 1,
  needsHuman: 3,
  ok: 0,
} as const;

export type ExitCodesKey = keyof typeof EXIT_CODES;
export type ExitCodesValue = (typeof EXIT_CODES)[ExitCodesKey];

/** @description The status URL of a tweet, which works without knowing the account's handle. */
export const TWEET_URL_PREFIX = 'https://x.com/i/web/status/';
