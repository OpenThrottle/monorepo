import { describe, expect, test } from 'vitest';

import { skillFrontmatterSchema } from '../agent-asset-frontmatter.schemas.js';

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
