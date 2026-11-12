import type { RolloutFlagKindOption } from '~/routing/settings/data/data.rollout-kinds';
import { ROLLOUT_FLAG_KINDS } from '~/routing/settings/data/data.rollout-kinds';

export const isRolloutFlagKind = (
  value: string,
): value is RolloutFlagKindOption => {
  return ROLLOUT_FLAG_KINDS.some((kind) => kind === value);
};
