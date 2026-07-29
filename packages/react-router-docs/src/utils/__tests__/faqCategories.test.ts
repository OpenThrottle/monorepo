import { describe, expect, test } from 'vitest';
import { buildFaqCategories } from '../faqCategories';
import type { DocEntry } from '../buildDocsManifest';

const faq = (group: string, slug: string): DocEntry => ({
  content: '',
  description: null,
  draft: false,
  group,
  order: 1,
  path: '/faq',
  section: 'faq',
  slug,
  title: slug,
});

describe('buildFaqCategories', () => {
  test('de-duplicates groups, orders alphabetically, and slugs ids', () => {
    const entries = [
      faq('01. Local Development', 'a'),
      faq('00. General', 'b'),
      faq('01. Local Development', 'c'),
    ];

    expect(buildFaqCategories(entries)).toEqual([
      { id: '00-general', label: '00. General' },
      { id: '01-local-development', label: '01. Local Development' },
    ]);
  });

  test('returns nothing for no entries', () => {
    expect(buildFaqCategories([])).toEqual([]);
  });
});
