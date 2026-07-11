import { describe, expect, test } from 'vitest';

import {
  ruleFrontmatterSchema,
  skillFrontmatterSchema,
} from '../agent-asset-frontmatter.schemas.js';

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

describe('skillFrontmatterSchema tags (permissive, not vocabulary-checked)', () => {
  const base = {
    description: 'A skill.',
    name: 'a-skill',
  };

  test('accepts valid kebab-case tags', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...base,
      tags: ['github', 'pr-review'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(['github', 'pr-review']);
    }
  });

  test('accepts an empty tags array', () => {
    const result = skillFrontmatterSchema.safeParse({ ...base, tags: [] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  test('allows the tags key to be absent entirely', () => {
    const result = skillFrontmatterSchema.safeParse(base);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toBeUndefined();
    }
  });

  test('accepts a tag outside the committed default vocabulary (permissive, split validation)', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...base,
      tags: ['some-tag-not-in-the-committed-vocabulary'],
    });

    expect(result.success).toBe(true);
  });

  test('rejects a non-kebab-case tag', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...base,
      tags: ['NotKebabCase'],
    });

    expect(result.success).toBe(false);
  });

  test('rejects a tag containing an underscore', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...base,
      tags: ['pr_review'],
    });

    expect(result.success).toBe(false);
  });

  test('rejects an empty-string tag entry', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...base,
      tags: [''],
    });

    expect(result.success).toBe(false);
  });

  test('rejects a non-string tag entry', () => {
    const result = skillFrontmatterSchema.safeParse({
      ...base,
      tags: [1],
    });

    expect(result.success).toBe(false);
  });
});
