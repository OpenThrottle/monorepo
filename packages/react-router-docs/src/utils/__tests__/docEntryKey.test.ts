import { describe, expect, test } from 'vitest';
import { docEntryKey } from '../docEntryKey';
import type { DocEntry } from '../buildDocsManifest';

const makeEntry = (overrides: Partial<DocEntry>): DocEntry => ({
  content: '',
  description: null,
  draft: false,
  group: 'General',
  order: 1,
  path: '/docs/example',
  section: 'docs',
  slug: 'example',
  title: 'Title',
  ...overrides,
});

describe('docEntryKey', () => {
  test('joins the section and slug with a colon', () => {
    const entry = makeEntry({ section: 'docs', slug: 'getting-started' });

    expect(docEntryKey(entry)).toBe('docs:getting-started');
  });

  test('normalizes an empty slug (section index page) to "index"', () => {
    const entry = makeEntry({ section: 'docs', slug: '' });

    expect(docEntryKey(entry)).toBe('docs:index');
  });

  test('works for the faq section too', () => {
    const entry = makeEntry({ section: 'faq', slug: 'billing' });

    expect(docEntryKey(entry)).toBe('faq:billing');
  });

  test('preserves nested slug segments', () => {
    const entry = makeEntry({ section: 'docs', slug: 'guides/deploy' });

    expect(docEntryKey(entry)).toBe('docs:guides/deploy');
  });
});
