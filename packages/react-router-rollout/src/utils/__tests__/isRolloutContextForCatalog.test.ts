import { describe, expect, test } from 'vitest';

import type { RolloutContextValue } from '../../data';
import { defineRolloutFlags } from '../defineRolloutFlags';
import { isRolloutContextForCatalog } from '../isRolloutContextForCatalog';

const flags = defineRolloutFlags({
  'billing.invoices': { defaultValue: false, kind: 'boolean' },
});

const createContext = (
  catalog: RolloutContextValue['catalog'],
): RolloutContextValue => {
  return {
    applicationKey: 'predicate-app',
    catalog,
    hydration: { status: 'idle' },
    refresh: async () => undefined,
    values: {},
  };
};

describe('isRolloutContextForCatalog', () => {
  test('accepts a context built from the same catalog object', () => {
    expect(isRolloutContextForCatalog(createContext(flags), flags)).toBe(true);
  });

  test('rejects a structurally equal but distinct catalog object', () => {
    const lookalike = defineRolloutFlags({
      'billing.invoices': { defaultValue: false, kind: 'boolean' },
    });

    expect(isRolloutContextForCatalog(createContext(lookalike), flags)).toBe(
      false,
    );
  });
});
