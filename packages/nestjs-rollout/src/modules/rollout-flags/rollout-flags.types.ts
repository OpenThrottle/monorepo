import type {
  ROLLOUT_EVALUATION_REASON,
  ROLLOUT_FLAG_KIND,
} from './rollout-flags.constants.ts';

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
  boolean | number | string | RolloutJsonValue;

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

export type RolloutEvaluationReason =
  (typeof ROLLOUT_EVALUATION_REASON)[keyof typeof ROLLOUT_EVALUATION_REASON];

/**
 * Result of typed flag evaluation for one actor.
 * `isEnabled` returns `value === true` when `kind === boolean`; otherwise false.
 */
export interface RolloutEvaluation {
  key: string;
  kind: RolloutFlagKind;
  reason: RolloutEvaluationReason;
  value: RolloutVariationValue;
  variationIndex: number;
}
/** Fields accepted when creating a flag. */
export interface CreateRolloutFlagInput {
  description?: string | null;
  enabled?: boolean;
  fallthrough?: RolloutFallthrough;
  key: string;
  kind?: RolloutFlagKind;
  offVariation?: number;
  targetRoles?: string[];
  variations?: RolloutFlagVariation[];
}

/** Fields accepted when updating a flag (all optional / partial patch). */
export interface UpdateRolloutFlagInput {
  description?: string | null;
  enabled?: boolean;
  fallthrough?: RolloutFallthrough;
  key?: string;
  kind?: RolloutFlagKind;
  offVariation?: number;
  targetRoles?: string[];
  variations?: RolloutFlagVariation[];
}
