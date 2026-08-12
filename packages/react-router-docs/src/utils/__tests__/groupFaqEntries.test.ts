import { describe, expect, test } from 'vitest';
import { groupFaqEntries } from '../groupFaqEntries';
import type { DocEntry } from '../buildDocsManifest';

const makeEntry = (overrides: Partial<DocEntry>): DocEntry => ({
  content: '',
  description: null,
  draft: false,
  group: 'General',
  order: 1,
  path: '/faq/question',
  section: 'faq',
  slug: 'question',
  title: 'Question?',
  ...overrides,
});

describe('groupFaqEntries', () => {
  test('returns an empty list for no entries', () => {
    expect(groupFaqEntries([])).toEqual([]);
  });

  test('groups entries by their manifest group', () => {
    const entries = [
      makeEntry({ group: 'Billing', slug: 'billing-1', title: 'B1' }),
      makeEntry({ group: 'Support', slug: 'support-1', title: 'S1' }),
      makeEntry({ group: 'Billing', slug: 'billing-2', title: 'B2' }),
    ];

    const groups = groupFaqEntries(entries);

    expect(groups).toHaveLength(2);
    const billing = groups.find((group) => group.label === 'Billing');
    expect(billing?.entries.map((entry) => entry.title)).toEqual(['B1', 'B2']);
  });

  test('sorts groups alphabetically by label', () => {
    const entries = [
      makeEntry({ group: 'Zeta', slug: 'z', title: 'Z' }),
      makeEntry({ group: 'Alpha', slug: 'a', title: 'A' }),
      makeEntry({ group: 'Mid', slug: 'm', title: 'M' }),
    ];

    const groups = groupFaqEntries(entries);

    expect(groups.map((group) => group.label)).toEqual([
      'Alpha',
      'Mid',
      'Zeta',
    ]);
  });

  test('preserves manifest order of entries within a group', () => {
    const entries = [
      makeEntry({ group: 'General', slug: 'third', title: 'Third' }),
      makeEntry({ group: 'General', slug: 'first', title: 'First' }),
      makeEntry({ group: 'General', slug: 'second', title: 'Second' }),
    ];

    const groups = groupFaqEntries(entries);

    expect(groups[0].entries.map((entry) => entry.title)).toEqual([
      'Third',
      'First',
      'Second',
    ]);
  });
});
