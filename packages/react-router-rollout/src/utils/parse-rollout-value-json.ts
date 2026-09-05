import {
  isRolloutFlagKind,
  type RolloutFlagKind,
} from '../config/rollout-flag-kind';
import type { RolloutFlagValueByKind } from '../types';
import { isRolloutFlagValueForKind } from './assert-rollout-flag-catalog';

/**
 * Parse a server `valueJson` string into a typed value for the given kind.
 * Returns `undefined` when JSON parse fails or the value does not match kind.
 *
 * @public
 */
export const parseRolloutValueJson = <TKey extends RolloutFlagKind>(
  kind: TKey,
  valueJson: string,
): RolloutFlagValueByKind[TKey] | undefined => {
  if (!isRolloutFlagKind(kind)) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(valueJson);
    if (!isRolloutFlagValueForKind(kind, parsed)) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
};
