/**
 * @description Shared constants and JSON shapes for typed rollout flags
 * (databases/migrations/084 + 089). `as const` objects instead of TS enums.
 */

/** Flag value kinds. Mirrors chk_rollout_flags_kind. */
export const ROLLOUT_FLAG_KIND = {
  BOOLEAN: 'boolean',
  JSON: 'json',
  NUMBER: 'number',
  STRING: 'string',
} as const;

export type RolloutFlagKind =
  (typeof ROLLOUT_FLAG_KIND)[keyof typeof ROLLOUT_FLAG_KIND];

/** JSON-serializable value for `kind = json` variations. */
export type RolloutJsonValue =
  | boolean
  | number
  | string
  | null
  | RolloutJsonValue[]
  | { [key: string]: RolloutJsonValue };

/** Typed variation value; must match the flag's kind at write time. */
export type RolloutVariationValue =
  | boolean
  | number
  | string
  | RolloutJsonValue;

/**
 * One entry in `rollout_flags.variations` jsonb.
 * Shape: `{ name?, description?, value }` where `value` matches kind.
 */
export interface RolloutFlagVariation {
  description?: string;
  name?: string;
  value: RolloutVariationValue;
}

/**
 * One weighted bucket in fallthrough. `weight` is an integer percent 0–100;
 * all weights on a flag must sum to 100 (enforced in RolloutService).
 */
export interface RolloutFallthroughBucket {
  variation: number;
  weight: number;
}

/**
 * Percentage allocation among variations when the flag is enabled and the
 * actor passes targeting. Shape matches `rollout_flags.fallthrough` jsonb.
 */
export interface RolloutFallthrough {
  variations: RolloutFallthroughBucket[];
}

/** LD-like boolean defaults used by migration 089 and entity column defaults. */
export const ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS: RolloutFlagVariation[] = [
  { value: false },
  { value: true },
];

/** 100% weight on variation index 1 (`true` in the LD boolean defaults). */
export const ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH: RolloutFallthrough = {
  variations: [{ variation: 1, weight: 100 }],
};
