import type {
  RolloutFallthrough,
  RolloutFlagVariation,
} from './rollout-flags.types.ts';

/**
 * @description Shared constants and JSON shapes for typed rollout flags
 * (databases/openthrottle/migrations/084 + 089). `as const` objects instead of TS enums.
 */

/** Flag value kinds. Mirrors chk_rollout_flags_kind. */
export const ROLLOUT_FLAG_KIND = {
  BOOLEAN: 'boolean',
  JSON: 'json',
  NUMBER: 'number',
  STRING: 'string',
} as const;
/** LD-like boolean defaults used by migration 089 and entity column defaults. */
export const ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS: RolloutFlagVariation[] = [
  { value: false },
  { value: true },
];

/** 100% weight on variation index 1 (`true` in the LD boolean defaults). */
export const ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH: RolloutFallthrough = {
  variations: [{ variation: 1, weight: 100 }],
};

/**
 * Why a specific variation was chosen. Non-sticky bucketing caveat: `fallthrough`
 * uses principal-id → mod 100 as a stand-in for sticky hashing (replaced later).
 */
export const ROLLOUT_EVALUATION_REASON = {
  FALLTHROUGH: 'fallthrough',
  FLAG_NOT_FOUND: 'flag_not_found',
  OFF: 'off',
  TARGET_ROLES: 'target_roles',
} as const;
