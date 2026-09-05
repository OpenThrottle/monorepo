/**
 * @description The rollout flag that gates the beta /timeline route. Named once
 * so the loader's server-side evaluation and any client-side check cannot drift
 * apart, and so the key stays greppable from the flag catalog.
 */

import type { DeveloperRolloutFlags } from '~/global/data/data.rollout-flags';

/** Key in {@link DeveloperRolloutFlags}; defaults to `false` until turned on per user. */
export const TIMELINE_ROLLOUT_FLAG_KEY: keyof DeveloperRolloutFlags =
  'timeline';
