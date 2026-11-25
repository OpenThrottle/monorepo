/**
 * Flag value kinds. Wire strings match `@openthrottle/nestjs-rollout`
 * `ROLLOUT_FLAG_KIND` and the GraphQL `RolloutFlagKind` enum.
 *
 * @public
 */
export const ROLLOUT_FLAG_KIND = {
  BOOLEAN: 'boolean',
  JSON: 'json',
  NUMBER: 'number',
  STRING: 'string',
} as const;

export type RolloutFlagKindKey = keyof typeof ROLLOUT_FLAG_KIND;
/**
 * Union of rollout flag kind wire values.
 *
 * @public
 */
export type RolloutFlagKindValue =
  (typeof ROLLOUT_FLAG_KIND)[RolloutFlagKindKey];

const ROLLOUT_FLAG_KINDS = new Set<string>(Object.values(ROLLOUT_FLAG_KIND));

/**
 * Type guard for a runtime kind string.
 *
 * @public
 */
export const isRolloutFlagKind = (
  value: unknown,
): value is RolloutFlagKindValue => {
  return typeof value === 'string' && ROLLOUT_FLAG_KINDS.has(value);
};
