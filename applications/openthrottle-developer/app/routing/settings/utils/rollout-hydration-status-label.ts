import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';

/**
 * @description The status line for the rollout SDK hydration demo. Any status other than
 * `error`, `ready` or `loading` reads as idle.
 */
export const getRolloutHydrationStatusLabel = (status: string): string => {
  if (status === 'error') {
    return ROLLOUT_COPY.sdkHydrationError;
  }
  if (status === 'ready') {
    return ROLLOUT_COPY.sdkHydrationReady;
  }
  if (status === 'loading') {
    return ROLLOUT_COPY.sdkHydrationLoading;
  }
  return ROLLOUT_COPY.sdkHydrationIdle;
};
