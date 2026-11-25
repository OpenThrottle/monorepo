/**
 * @description Scheduled X posting for @openthrottleai from a rolling
 * OpenThrottle "social" plan: the tweet-task contract, its parser, and the
 * scripts the scheduled jobs run.
 */

export type {
  Result,
  SocialPost,
  SocialPostKind,
  SocialPostMetrics,
  SocialPostParseError,
} from './types/social-post.ts';
export type { XAuthorizationError } from './utils/completeXAuthorization.ts';
export type {
  XTokenClient,
  XTokenClientError,
} from './utils/createXTokenClient.ts';
export { createXTokenClient } from './utils/createXTokenClient.ts';
export { getWeightedTweetLength } from './utils/getWeightedTweetLength.ts';
export {
  parseSocialPost,
  parseSocialPostValue,
  serializeSocialPost,
} from './utils/parseSocialPost.ts';
export { getUserEnvPath } from './utils/user-env-file.ts';
export type { XOAuthError } from './utils/x-oauth.ts';
