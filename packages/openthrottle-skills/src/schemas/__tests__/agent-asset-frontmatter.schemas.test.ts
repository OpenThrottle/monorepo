import { describe, expect, test } from 'vitest';

import { ruleFrontmatterSchema } from '../agent-asset-frontmatter.schemas.js';

describe('ruleFrontmatterSchema globs union', () => {
  test('accepts globs as a single string', () => {
    const result = ruleFrontmatterSchema.safeParse({
      description: 'A rule',
      globs: '**/*.ts',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.globs).toBe('**/*.ts');
    }
  });

  test('accepts globs as an array of strings (z.union array branch)', () => {
    const result = ruleFrontmatterSchema.safeParse({
      description: 'A rule',
      globs: ['**/*.ts', '**/*.tsx'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.globs).toEqual(['**/*.ts', '**/*.tsx']);
    }
  });

  test('rejects globs as a non-string array element', () => {
    const result = ruleFrontmatterSchema.safeParse({
      description: 'A rule',
      globs: [1, 2],
    });

    expect(result.success).toBe(false);
  });

  test('allows globs to be omitted', () => {
    const result = ruleFrontmatterSchema.safeParse({ description: 'A rule' });

    expect(result.success).toBe(true);
  });
});
