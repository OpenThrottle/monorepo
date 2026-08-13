import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  assertRolloutFlagCatalog,
  defineRolloutFlags,
  isRolloutFlagKind,
  isRolloutFlagValueForKind,
  ROLLOUT_FLAG_KIND,
  type RolloutBooleanFlagKey,
  type RolloutFlagKey,
  type RolloutFlagValue,
} from '../../index';

describe('ROLLOUT_FLAG_KIND', () => {
  it('pins wire values to GraphQL / nestjs-rollout kinds', () => {
    expect(ROLLOUT_FLAG_KIND).toEqual({
      BOOLEAN: 'boolean',
      JSON: 'json',
      NUMBER: 'number',
      STRING: 'string',
    });
  });
});

describe('isRolloutFlagKind', () => {
  describe('when the value is a known kind', () => {
    it('returns true', () => {
      expect(isRolloutFlagKind('boolean')).toBe(true);
      expect(isRolloutFlagKind('json')).toBe(true);
      expect(isRolloutFlagKind('number')).toBe(true);
      expect(isRolloutFlagKind('string')).toBe(true);
    });
  });

  describe('when the value is unknown', () => {
    it('returns false', () => {
      expect(isRolloutFlagKind('percent')).toBe(false);
      expect(isRolloutFlagKind(null)).toBe(false);
      expect(isRolloutFlagKind(1)).toBe(false);
    });
  });
});

describe('isRolloutFlagValueForKind', () => {
  describe('when kind is boolean', () => {
    it('accepts booleans only', () => {
      expect(isRolloutFlagValueForKind('boolean', true)).toBe(true);
      expect(isRolloutFlagValueForKind('boolean', false)).toBe(true);
      expect(isRolloutFlagValueForKind('boolean', 'true')).toBe(false);
    });
  });

  describe('when kind is string', () => {
    it('accepts strings only', () => {
      expect(isRolloutFlagValueForKind('string', 'system')).toBe(true);
      expect(isRolloutFlagValueForKind('string', 1)).toBe(false);
    });
  });

  describe('when kind is number', () => {
    it('accepts finite numbers only', () => {
      expect(isRolloutFlagValueForKind('number', 0)).toBe(true);
      expect(isRolloutFlagValueForKind('number', Number.NaN)).toBe(false);
      expect(
        isRolloutFlagValueForKind('number', Number.POSITIVE_INFINITY),
      ).toBe(false);
      expect(isRolloutFlagValueForKind('number', '1')).toBe(false);
    });
  });

  describe('when kind is json', () => {
    it('accepts plain objects and arrays only', () => {
      expect(isRolloutFlagValueForKind('json', { a: 1 })).toBe(true);
      expect(isRolloutFlagValueForKind('json', [1, 'x'])).toBe(true);
      expect(isRolloutFlagValueForKind('json', null)).toBe(false);
      expect(isRolloutFlagValueForKind('json', 'raw')).toBe(false);
    });
  });
});

describe('defineRolloutFlags', () => {
  describe('when defaults match declared kinds', () => {
    it('returns the same catalog object', () => {
      const input = {
        'billing.invoices': {
          defaultValue: false,
          kind: 'boolean' as const,
        },
        'experiment.payload': {
          defaultValue: { cohort: 'control' },
          kind: 'json' as const,
        },
        'theme.mode': {
          defaultValue: 'system',
          kind: 'string' as const,
        },
        'ui.maxWidgets': {
          defaultValue: 3,
          kind: 'number' as const,
        },
      };

      const flags = defineRolloutFlags(input);

      expect(flags).toBe(input);
    });

    it('infers catalog keys and value types', () => {
      const flags = defineRolloutFlags({
        'billing.invoices': { defaultValue: false, kind: 'boolean' },
        'theme.mode': { defaultValue: 'system', kind: 'string' },
        'ui.maxWidgets': { defaultValue: 3, kind: 'number' },
      });

      type Catalog = typeof flags;
      type Keys = RolloutFlagKey<Catalog>;

      expect(flags['billing.invoices'].defaultValue).toBe(false);
      expectTypeOf<
        'billing.invoices' | 'theme.mode' | 'ui.maxWidgets'
      >().toEqualTypeOf<Keys>();
      expectTypeOf<
        RolloutFlagValue<Catalog, 'billing.invoices'>
      >().toEqualTypeOf<boolean>();
      expectTypeOf<
        RolloutFlagValue<Catalog, 'theme.mode'>
      >().toEqualTypeOf<string>();
      expectTypeOf<
        RolloutFlagValue<Catalog, 'ui.maxWidgets'>
      >().toEqualTypeOf<number>();
      expectTypeOf<
        RolloutBooleanFlagKey<Catalog>
      >().toEqualTypeOf<'billing.invoices'>();

      // Unknown keys are not assignable to RolloutFlagKey
      expectTypeOf<'billing.invoices'>().toMatchTypeOf<Keys>();
      expectTypeOf<'not.a.flag'>().not.toMatchTypeOf<Keys>();
    });
  });

  describe('when a default does not match its kind', () => {
    it('throws for a boolean/string mismatch', () => {
      expect(() =>
        assertRolloutFlagCatalog({
          'billing.invoices': { defaultValue: 'nope', kind: 'boolean' },
        }),
      ).toThrow(
        '@openthrottle/react-router-rollout: flag "billing.invoices" defaultValue does not match kind "boolean"',
      );
    });

    it('throws for a json primitive default', () => {
      expect(() =>
        assertRolloutFlagCatalog({
          'experiment.payload': { defaultValue: 'raw', kind: 'json' },
        }),
      ).toThrow(
        '@openthrottle/react-router-rollout: flag "experiment.payload" defaultValue does not match kind "json"',
      );
    });
  });
});

describe('assertRolloutFlagCatalog', () => {
  describe('when the catalog is valid', () => {
    it('does not throw', () => {
      expect(() =>
        assertRolloutFlagCatalog({
          'billing.invoices': { defaultValue: false, kind: 'boolean' },
        }),
      ).not.toThrow();
    });
  });

  describe('when a kind is unknown', () => {
    it('throws', () => {
      expect(() =>
        assertRolloutFlagCatalog({
          broken: {
            defaultValue: true,
            kind: 'percent',
          },
        }),
      ).toThrow(
        '@openthrottle/react-router-rollout: flag "broken" has unknown kind "percent"',
      );
    });
  });
});
