import { describe, expect, it } from 'vitest';

import { defineRolloutFlags } from '../../index';
import { defaultsFromCatalog } from '../defaults-from-catalog';

describe('defaultsFromCatalog', () => {
  describe('with a representative catalog', () => {
    const catalog = defineRolloutFlags({
      'billing.invoices': { defaultValue: false, kind: 'boolean' },
      'experiment.payload': {
        defaultValue: { cohort: 'control' },
        kind: 'json',
      },
      'theme.mode': { defaultValue: 'system', kind: 'string' },
      'ui.maxWidgets': { defaultValue: 3, kind: 'number' },
    });

    it('returns each key mapped to its declared default value', () => {
      expect(defaultsFromCatalog(catalog)).toEqual({
        'billing.invoices': false,
        'experiment.payload': { cohort: 'control' },
        'theme.mode': 'system',
        'ui.maxWidgets': 3,
      });
    });
  });

  describe('with an empty catalog', () => {
    it('returns an empty values map', () => {
      const catalog = defineRolloutFlags({});

      expect(defaultsFromCatalog(catalog)).toEqual({});
    });
  });

  describe('with a single flag', () => {
    it('does not leak keys from other calls (fresh object per invocation)', () => {
      const catalogA = defineRolloutFlags({
        'feature.a': { defaultValue: true, kind: 'boolean' },
      });
      const catalogB = defineRolloutFlags({
        'feature.b': { defaultValue: 'value', kind: 'string' },
      });

      const valuesA = defaultsFromCatalog(catalogA);
      const valuesB = defaultsFromCatalog(catalogB);

      expect(valuesA).toEqual({ 'feature.a': true });
      expect(valuesB).toEqual({ 'feature.b': 'value' });
      expect(valuesA).not.toHaveProperty('feature.b');
      expect(valuesB).not.toHaveProperty('feature.a');
    });
  });

  describe('when a default value is falsy or zero-like', () => {
    it('still resolves the falsy default rather than dropping the key', () => {
      const catalog = defineRolloutFlags({
        'billing.enabled': { defaultValue: false, kind: 'boolean' },
        'limits.retries': { defaultValue: 0, kind: 'number' },
        'search.query': { defaultValue: '', kind: 'string' },
      });

      const values = defaultsFromCatalog(catalog);

      expect(values).toEqual({
        'billing.enabled': false,
        'limits.retries': 0,
        'search.query': '',
      });
    });
  });
});
