import { describe, expect, expectTypeOf, test } from 'vitest';
import {
  developerRolloutFlags,
  type DeveloperRolloutFlags,
} from '../data.rollout-flags';
import type { RolloutFlagValue } from '@openthrottle/react-router-rollout';

describe('developerRolloutFlags', () => {
  test('declares the catalog entries with defaults', () => {
    expect(developerRolloutFlags.beta).toEqual({
      defaultValue: false,
      kind: 'boolean',
    });
    expect(developerRolloutFlags.navigation).toEqual({
      defaultValue: false,
      kind: 'boolean',
    });
    expect(developerRolloutFlags['example-string-one']).toEqual({
      defaultValue: 'default-value',
      kind: 'string',
    });
  });

  test('types catalog values by kind', () => {
    expectTypeOf<
      RolloutFlagValue<DeveloperRolloutFlags, 'beta'>
    >().toEqualTypeOf<boolean>();
    expectTypeOf<
      RolloutFlagValue<DeveloperRolloutFlags, 'navigation'>
    >().toEqualTypeOf<boolean>();
    expectTypeOf<
      RolloutFlagValue<DeveloperRolloutFlags, 'example-string-one'>
    >().toEqualTypeOf<string>();
  });
});
