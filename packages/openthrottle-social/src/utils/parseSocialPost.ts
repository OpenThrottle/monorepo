import { isRecord, toErrorMessage } from '@openthrottle/nodejs-utils';

import {
  POLL_MAX_DURATION_MINUTES,
  POLL_MAX_OPTIONS,
  POLL_MIN_DURATION_MINUTES,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
  THREAD_MIN_TWEETS,
  TWEET_MAX_WEIGHTED_LENGTH,
} from '../config/social-post.ts';
import type {
  Result,
  SocialPost,
  SocialPostBase,
  SocialPostMetrics,
  SocialPostParseError,
  SocialPostTextField,
} from '../types/social-post.ts';
import { getWeightedTweetLength } from './getWeightedTweetLength.ts';

type ParseResult<TValue> = Result<TValue, SocialPostParseError>;

const POST_ON_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

const ok = <TValue>(value: TValue): ParseResult<TValue> => {
  return { ok: true, value };
};

const shapeError = <TValue>(
  path: string,
  message: string,
): ParseResult<TValue> => {
  return { error: { kind: 'invalid-shape', message, path }, ok: false };
};

const isCalendarDate = (value: string): boolean => {
  if (!POST_ON_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

const readString = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): ParseResult<string> => {
  const value = record[key];

  if (typeof value !== 'string' || value.trim() === '') {
    return shapeError(key, `${key} must be a non-empty string`);
  }

  return ok(value);
};

const readOptionalString = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): ParseResult<string | undefined> => {
  const value = record[key];

  if (value === undefined || value === null) {
    return ok(undefined);
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return shapeError(key, `${key} must be a non-empty string when set`);
  }

  return ok(value);
};

const readStringArray = (
  record: Readonly<Record<string, unknown>>,
  key: string,
): ParseResult<ReadonlyArray<string>> => {
  const value = record[key];

  if (!Array.isArray(value)) {
    return shapeError(key, `${key} must be an array of strings`);
  }

  const strings: string[] = [];

  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string' || item.trim() === '') {
      return shapeError(`${key}[${index}]`, 'must be a non-empty string');
    }

    strings.push(item);
  }

  return ok(strings);
};

const readMetrics = (
  record: Readonly<Record<string, unknown>>,
): ParseResult<SocialPostMetrics | undefined> => {
  const value = record['metrics'];

  if (value === undefined || value === null) {
    return ok(undefined);
  }

  if (!isRecord(value)) {
    return shapeError('metrics', 'metrics must be an object when set');
  }

  const counts = [
    'bookmarkCount',
    'impressionCount',
    'likeCount',
    'quoteCount',
    'replyCount',
    'retweetCount',
  ];
  const badCount = counts.find((key) => {
    const count = value[key];

    return typeof count !== 'number' || !Number.isInteger(count) || count < 0;
  });

  if (badCount !== undefined) {
    return shapeError(`metrics.${badCount}`, 'must be a non-negative integer');
  }

  const recordedAt = value['recordedAt'];

  if (typeof recordedAt !== 'string' || Number.isNaN(Date.parse(recordedAt))) {
    return shapeError('metrics.recordedAt', 'must be an ISO timestamp');
  }

  return ok({
    bookmarkCount: Number(value['bookmarkCount']),
    impressionCount: Number(value['impressionCount']),
    likeCount: Number(value['likeCount']),
    quoteCount: Number(value['quoteCount']),
    recordedAt,
    replyCount: Number(value['replyCount']),
    retweetCount: Number(value['retweetCount']),
  });
};

const readPostedTweetIds = (
  record: Readonly<Record<string, unknown>>,
): ParseResult<ReadonlyArray<string>> => {
  if (record['postedTweetIds'] === undefined) {
    return ok([]);
  }

  return readStringArray(record, 'postedTweetIds');
};

const readBase = (
  record: Readonly<Record<string, unknown>>,
): ParseResult<SocialPostBase> => {
  const postOn = readString(record, 'postOn');

  if (!postOn.ok) {
    return postOn;
  }

  if (!isCalendarDate(postOn.value)) {
    return shapeError('postOn', 'postOn must be a real YYYY-MM-DD date');
  }

  const firstReply = readOptionalString(record, 'firstReply');

  if (!firstReply.ok) {
    return firstReply;
  }

  const media = readOptionalString(record, 'media');

  if (!media.ok) {
    return media;
  }

  const metrics = readMetrics(record);

  if (!metrics.ok) {
    return metrics;
  }

  const postedTweetIds = readPostedTweetIds(record);

  if (!postedTweetIds.ok) {
    return postedTweetIds;
  }

  return ok({
    firstReply: firstReply.value,
    media: media.value,
    metrics: metrics.value,
    postOn: postOn.value,
    postedTweetIds: postedTweetIds.value,
  });
};

const checkLength = (
  text: string,
  field: SocialPostTextField,
  index: number,
): SocialPostParseError | undefined => {
  const length = getWeightedTweetLength(text);

  if (length <= TWEET_MAX_WEIGHTED_LENGTH) {
    return undefined;
  }

  return {
    field,
    index,
    kind: 'too-long',
    length,
    max: TWEET_MAX_WEIGHTED_LENGTH,
  };
};

const readPoll = (
  record: Readonly<Record<string, unknown>>,
  base: SocialPostBase,
): ParseResult<SocialPost> => {
  const text = readString(record, 'text');

  if (!text.ok) {
    return text;
  }

  const options = readStringArray(record, 'options');

  if (!options.ok) {
    return options;
  }

  const optionCount = options.value.length;

  if (optionCount < POLL_MIN_OPTIONS || optionCount > POLL_MAX_OPTIONS) {
    return shapeError('options', `a poll needs 2 to 4 options`);
  }

  const longOption = options.value.findIndex((option) => {
    return [...option].length > POLL_OPTION_MAX_LENGTH;
  });

  if (longOption !== -1) {
    return shapeError(
      `options[${longOption}]`,
      'must be 25 characters or less',
    );
  }

  const durationMinutes = record['durationMinutes'];
  const isDurationValid =
    typeof durationMinutes === 'number' &&
    Number.isInteger(durationMinutes) &&
    durationMinutes >= POLL_MIN_DURATION_MINUTES &&
    durationMinutes <= POLL_MAX_DURATION_MINUTES;

  if (!isDurationValid) {
    return shapeError('durationMinutes', 'must be whole minutes, 5 to 10080');
  }

  return ok({
    ...base,
    durationMinutes,
    kind: 'poll',
    options: options.value,
    text: text.value,
  });
};

const readKind = (
  record: Readonly<Record<string, unknown>>,
  base: SocialPostBase,
): ParseResult<SocialPost> => {
  const kind = record['kind'];

  if (kind === 'single') {
    const text = readString(record, 'text');

    return text.ok ? ok({ ...base, kind, text: text.value }) : text;
  }

  if (kind === 'thread') {
    const tweets = readStringArray(record, 'tweets');

    if (!tweets.ok) {
      return tweets;
    }

    if (tweets.value.length < THREAD_MIN_TWEETS) {
      return shapeError('tweets', 'a thread needs at least 2 tweets');
    }

    return ok({ ...base, kind, tweets: tweets.value });
  }

  if (kind === 'poll') {
    return readPoll(record, base);
  }

  return shapeError('kind', `kind must be "single", "thread" or "poll"`);
};

const findTooLong = (post: SocialPost): SocialPostParseError | undefined => {
  const bodies = post.kind === 'thread' ? post.tweets : [post.text];
  const field = post.kind === 'thread' ? 'tweets' : 'text';
  const bodyErrors = bodies.map((body, index) => {
    return checkLength(body, field, index);
  });
  const reply = post.firstReply;
  const replyError = reply ? checkLength(reply, 'firstReply', 0) : undefined;

  return [...bodyErrors, replyError].find((error) => error !== undefined);
};

/**
 * @description Validate an already-decoded payload (the one element of a
 * tweet task's requirements array). Never throws.
 * @public
 */
export const parseSocialPostValue = (
  value: unknown,
): Result<SocialPost, SocialPostParseError> => {
  if (!isRecord(value)) {
    return shapeError('', 'the payload must be an object');
  }

  const base = readBase(value);

  if (!base.ok) {
    return base;
  }

  const post = readKind(value, base.value);

  if (!post.ok) {
    return post;
  }

  const tooLong = findTooLong(post.value);

  return tooLong === undefined ? post : { error: tooLong, ok: false };
};

/**
 * @description Parse a tweet task's `requirementsJson`: a JSON array holding
 * exactly one {@link SocialPost}. Never throws; an over-length tweet fails
 * with its field and index.
 * @public
 */
export const parseSocialPost = (
  requirementsJson: string,
): Result<SocialPost, SocialPostParseError> => {
  let decoded: unknown;

  try {
    decoded = JSON.parse(requirementsJson);
  } catch (error) {
    const message = toErrorMessage(error);

    return { error: { kind: 'invalid-json', message }, ok: false };
  }

  if (!Array.isArray(decoded) || decoded.length !== 1) {
    return shapeError('', 'requirements must be an array of exactly one post');
  }

  return parseSocialPostValue(decoded[0]);
};

/**
 * @description The `requirements` string to write back to a tweet task.
 * @public
 */
export const serializeSocialPost = (post: SocialPost): string => {
  return JSON.stringify([post]);
};
