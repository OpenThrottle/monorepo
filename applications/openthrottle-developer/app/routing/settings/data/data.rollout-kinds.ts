/**
 * @description Kind options for the rollout typed-flag settings form.
 */

import { RolloutFlagKind } from '~/__generated__/graphql';

/** UI order for the kind selector (boolean | string | number | json). */
export const ROLLOUT_FLAG_KINDS = [
  RolloutFlagKind.Boolean,
  RolloutFlagKind.String,
  RolloutFlagKind.Number,
  RolloutFlagKind.Json,
] as const;

export type RolloutFlagKindOption = (typeof ROLLOUT_FLAG_KINDS)[number];

export const isRolloutFlagKind = (
  value: string,
): value is RolloutFlagKindOption =>
  ROLLOUT_FLAG_KINDS.some((kind) => kind === value);
