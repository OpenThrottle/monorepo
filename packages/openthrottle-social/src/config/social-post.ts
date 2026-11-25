/**
 * @description X counts a post against a 280-unit budget. Most Latin, Greek
 * and Cyrillic characters cost 1, CJK and emoji cost 2, and every URL costs
 * {@link TWEET_URL_WEIGHT} whatever its real length.
 */
export const TWEET_MAX_WEIGHTED_LENGTH = 280;

/** @description What X charges a URL once its link shortener has wrapped it. */
export const TWEET_URL_WEIGHT = 23;

/** @description A poll offers between two and four options. */
export const POLL_MIN_OPTIONS = 2;

/** @description A poll offers between two and four options. */
export const POLL_MAX_OPTIONS = 4;

/** @description The longest poll option X accepts, in characters. */
export const POLL_OPTION_MAX_LENGTH = 25;

/** @description The shortest poll X runs: five minutes. */
export const POLL_MIN_DURATION_MINUTES = 5;

/** @description The longest poll X runs: seven days. */
export const POLL_MAX_DURATION_MINUTES = 10_080;

/** @description The fewest tweets a thread holds: one tweet is a `single`. */
export const THREAD_MIN_TWEETS = 2;

/** @description The time zone every `postOn` date is read in. */
export const SOCIAL_POST_TIME_ZONE = 'America/Los_Angeles';

/**
 * @description The code point ranges X weighs as 1 (everything else weighs 2):
 * Latin through Hangul Jamo, plus the general-punctuation spaces, dashes,
 * quotes and primes. Taken from twitter-text v3's default config.
 */
export const LIGHT_CODE_POINT_RANGES: ReadonlyArray<
  readonly [start: number, end: number]
> = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];
