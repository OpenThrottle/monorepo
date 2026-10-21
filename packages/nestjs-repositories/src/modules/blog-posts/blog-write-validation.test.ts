import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  assertBlogSlug,
  assertNotBlank,
  BLOG_SLUG_PATTERN,
} from './blog-write-validation.ts';

const MIGRATION = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../databases/migrations/131_create_blog_tables.sql',
);

describe('BLOG_SLUG_PATTERN', () => {
  it('is exactly the regex of the three slug CHECK constraints in migration 131', () => {
    const sql = readFileSync(MIGRATION, 'utf8');
    const checks = [
      ...sql.matchAll(
        /CONSTRAINT chk_blog_\w+_slug CHECK \(slug ~ '([^']+)'\)/g,
      ),
    ].map((match) => match[1]);

    expect(checks).toHaveLength(3);
    for (const check of checks) {
      expect(check).toBe(BLOG_SLUG_PATTERN.source);
    }
  });
});

describe('assertBlogSlug', () => {
  it.each(['a', 'my-first-post', 'v2-0-release', '2026', 'a1-b2-c3'])(
    'accepts %s',
    (slug) => {
      expect(() => assertBlogSlug(slug)).not.toThrow();
    },
  );

  it.each([
    '',
    'Upper-Case',
    'has space',
    'under_score',
    '-leading',
    'trailing-',
    'double--hyphen',
    'trailing-newline\n',
    'unicode-é',
    'slash/path',
  ])('rejects %j with a BadRequestException', (slug) => {
    expect(() => assertBlogSlug(slug)).toThrow(BadRequestException);
  });

  it('names the offending field in the message', () => {
    expect(() => assertBlogSlug('Bad', 'tag slug')).toThrow(/tag slug "Bad"/);
  });
});

describe('assertNotBlank', () => {
  it('accepts text', () => {
    expect(() => assertNotBlank('Hello', 'title')).not.toThrow();
  });

  it.each(['', '   ', '\n\t'])('rejects %j', (value) => {
    expect(() => assertNotBlank(value, 'title')).toThrow(BadRequestException);
  });
});
