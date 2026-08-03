/**
 * @description Non-sticky percentage bucketing for rollout fallthrough.
 *
 * Derives a stable 0–99 bucket from a principal UUID by parsing the last 8 hex
 * digits (no dashes) as an integer and taking `% 100`. This is a stand-in for
 * true sticky hashing / assignment persistence and will be replaced later.
 * Even/odd splits are the 50/50 special case of the same math (weights 50/50).
 */

import type { RolloutFallthroughBucket } from './rollout-flag.constants';

/**
 * @description Maps a principal id (user/service-account UUID) to a bucket in
 * `[0, 100)`. Invalid / unparsable ids fall back to bucket `0`.
 */
export function principalIdToBucket(principalId: string): number {
  const hex = principalId.replace(/-/g, '').toLowerCase();
  const last8 = hex.slice(-8);
  if (!/^[0-9a-f]{1,8}$/.test(last8)) {
    return 0;
  }
  const idInt = Number.parseInt(last8, 16);
  if (!Number.isFinite(idInt)) {
    return 0;
  }
  return idInt % 100;
}

/**
 * @description Picks a variation index from ordered weighted buckets by mapping
 * `bucket` into cumulative ranges `[0, w1)`, `[w1, w1+w2)`, …. Returns the last
 * bucket's variation if weights do not cover the bucket (defensive).
 */
export function pickFallthroughVariation(
  buckets: readonly RolloutFallthroughBucket[],
  bucket: number,
): number {
  let cumulative = 0;
  for (const entry of buckets) {
    cumulative += entry.weight;
    if (bucket < cumulative) {
      return entry.variation;
    }
  }
  return buckets[buckets.length - 1]?.variation ?? 0;
}
