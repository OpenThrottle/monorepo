import { describe, expect, test } from 'vitest';
import { RolloutFlagKind } from '~/__generated__/graphql';
import { ROLLOUT_FLAG_KINDS, isRolloutFlagKind } from '../data.rollout-kinds';

describe('data.rollout-kinds', () => {
  test('lists the kind options in boolean|string|number|json order', () => {
    expect(ROLLOUT_FLAG_KINDS).toEqual([
      RolloutFlagKind.Boolean,
      RolloutFlagKind.String,
      RolloutFlagKind.Number,
      RolloutFlagKind.Json,
    ]);
  });

  test('isRolloutFlagKind accepts every known kind', () => {
    for (const kind of ROLLOUT_FLAG_KINDS) {
      expect(isRolloutFlagKind(kind)).toBe(true);
    }
  });

  test('isRolloutFlagKind rejects unknown values', () => {
    expect(isRolloutFlagKind('')).toBe(false);
    expect(isRolloutFlagKind('duration')).toBe(false);
    expect(isRolloutFlagKind('BOOLEAN')).toBe(false);
  });
});
