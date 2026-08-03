import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';

/**
 * @description Presentation helpers for the rollout (feature-flag) settings routes:
 * detail/edit paths and human-readable timestamp formatting.
 */

/** Path to a flag's detail route. */
export const rolloutFlagDetailPath = (id: string): string =>
  `/settings/rollout/${id}`;

/** Path to a flag's edit route. */
export const rolloutFlagEditPath = (id: string): string =>
  `/settings/rollout/${id}/edit`;

/** Locale timestamp, falling back to the raw value when unparseable. */
export const formatRolloutTimestamp = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

/** Display string for list/detail (e.g. "false 0% · true 100%"). */
export const formatRolloutAllocationSummary = (
  flag: Pick<RolloutFlagFieldsFragment, 'fallthrough' | 'variations'>,
): string => {
  if (flag.fallthrough.variations.length === 0) {
    return '—';
  }
  return flag.fallthrough.variations
    .map((bucket) => {
      const variation = flag.variations[bucket.variation];
      const label =
        variation?.name?.trim() ||
        variation?.valueJson ||
        `v${bucket.variation}`;
      return `${label} ${bucket.weight}%`;
    })
    .join(' · ');
};

/** Human label for the off / default variation index. */
export const formatRolloutOffVariationLabel = (
  flag: Pick<RolloutFlagFieldsFragment, 'offVariation' | 'variations'>,
): string => {
  const variation = flag.variations[flag.offVariation];
  if (!variation) {
    return `Variation ${flag.offVariation}`;
  }
  const name = variation.name?.trim();
  if (name) {
    return `${name} (${variation.valueJson})`;
  }
  return variation.valueJson;
};
