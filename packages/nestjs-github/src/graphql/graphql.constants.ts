import type { CacheHint } from '@openthrottle/nestjs-graphql';

/**
 * Cache hint for every GitHub API-backed query. PUBLIC: the data is fetched
 * with the server-wide `GITHUB_TOKEN`, never a per-user credential, so one
 * user's cached response is valid for every user.
 */
export const GITHUB_CACHE_HINT: CacheHint = {
  maxAge: 60 * 60, // 1 hour
  scope: 'PUBLIC',
};

/**
 * Cache hint for `githubTokenConfigured`. Deliberately far shorter than
 * {@link GITHUB_CACHE_HINT}: this value derives from server env rather than the
 * GitHub API, and the Apollo response cache is Redis-backed, so it outlives a
 * restart. At 1 hour a user who sets `GITHUB_TOKEN` and restarts could keep
 * being told the token is missing. 30s is long enough to be explicit — the
 * point is that it is never an accidental 0. PUBLIC: it is server config, the
 * same for every user.
 */
export const GITHUB_TOKEN_CONFIGURED_CACHE_HINT: CacheHint = {
  maxAge: 30, // 30 seconds
  scope: 'PUBLIC',
};
