/* eslint-disable sort-keys -- condition key order is the subject under test */
import { describe, expect, test } from 'vitest';

import { findConditionOrderViolations } from '../findConditionOrderViolations.ts';

describe('findConditionOrderViolations', () => {
  describe('when the value is not an object', () => {
    test.each([undefined, null, './src/index.ts', ['./a.js']])(
      'returns nothing for %j',
      (value) => {
        expect(findConditionOrderViolations(value, 'exports')).toEqual([]);
      },
    );
  });

  describe('when every condition object is ordered', () => {
    test('returns nothing for types first and default last', () => {
      const value = {
        '.': { types: './src/index.ts', default: './src/index.ts' },
        './*': { types: './*.d.ts', import: './*.js', require: './*.js' },
      };

      expect(findConditionOrderViolations(value, 'exports')).toEqual([]);
    });

    test('returns nothing for a condition object without types or default', () => {
      const value = { '.': { import: './a.js', require: './a.cjs' } };

      expect(findConditionOrderViolations(value, 'exports')).toEqual([]);
    });
  });

  describe('when types is not first', () => {
    test('reports types after default', () => {
      const value = {
        '.': { default: './src/index.ts', types: './src/index.ts' },
      };

      expect(findConditionOrderViolations(value, 'exports')).toEqual([
        { keys: ['default', 'types'], location: 'exports["."]' },
      ]);
    });

    test('reports types after import and require', () => {
      const value = {
        './nest': { import: './n.js', require: './n.js', types: './n.d.ts' },
      };

      expect(
        findConditionOrderViolations(value, 'publishConfig.exports'),
      ).toEqual([
        {
          keys: ['import', 'require', 'types'],
          location: 'publishConfig.exports["./nest"]',
        },
      ]);
    });
  });

  describe('when default is not last', () => {
    test('reports a condition listed after default', () => {
      const value = {
        '.': { types: './a.d.ts', default: './a.js', import: './a.mjs' },
      };

      expect(findConditionOrderViolations(value, 'exports')).toEqual([
        { keys: ['types', 'default', 'import'], location: 'exports["."]' },
      ]);
    });
  });

  describe('when condition objects nest', () => {
    test('reports the nested object with its full location', () => {
      const value = {
        '.': {
          import: { default: './a.mjs', types: './a.d.mts' },
          types: './a.d.ts',
        },
      };

      expect(findConditionOrderViolations(value, 'exports')).toEqual([
        { keys: ['import', 'types'], location: 'exports["."]' },
        { keys: ['default', 'types'], location: 'exports["."].import' },
      ]);
    });
  });

  describe('when the exports value is a bare condition object', () => {
    test('judges the top level itself', () => {
      const value = { default: './a.js', types: './a.d.ts' };

      expect(findConditionOrderViolations(value, 'exports')).toEqual([
        { keys: ['default', 'types'], location: 'exports' },
      ]);
    });
  });
});
