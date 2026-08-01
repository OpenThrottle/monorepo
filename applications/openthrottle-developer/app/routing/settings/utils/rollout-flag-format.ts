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
