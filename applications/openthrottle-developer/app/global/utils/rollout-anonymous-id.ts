/**
 * @description Stable-enough browser anonymous id for rollout bucketing when
 * unauthenticated. Persisted in localStorage so percentage splits are not random
 * on every refresh (sticky assignment tables remain out of scope).
 */

import { APP_NAME } from '@openthrottle/react-router-utils';

/** localStorage key for the developer-app anon subject. */
export const ROLLOUT_ANONYMOUS_ID_STORAGE_KEY =
  `${APP_NAME}:rollout:anonymousId` as const;

/**
 * Returns an existing anon id or creates and persists a UUID. SSR / private
 * mode without storage returns `null` (server uses the degraded shared subject).
 */
export const getOrCreateRolloutAnonymousId = (): string | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const existing = window.localStorage.getItem(
      ROLLOUT_ANONYMOUS_ID_STORAGE_KEY,
    );
    if (existing != null && existing.trim() !== '') {
      return existing.trim();
    }

    const id = crypto.randomUUID();
    window.localStorage.setItem(ROLLOUT_ANONYMOUS_ID_STORAGE_KEY, id);
    return id;
  } catch {
    return null;
  }
};
