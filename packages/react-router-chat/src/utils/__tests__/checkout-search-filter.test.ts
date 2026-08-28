import { describe, expect, it } from 'vitest';
import { checkoutSearchTerms } from '../checkout-groups';
import { checkoutSearchFilter } from '../checkout-search-filter';
import type { ChatCheckoutOption } from '../../types';

/**
 * The reported bug's list: personal checkouts alongside an org's, every one of
 * them under `/Users/matt/…` so the old fuzzy scoring matched them all.
 */
const CHECKOUTS: readonly ChatCheckoutOption[] = [
  {
    branch: 'main',
    filesystemPath: '/Users/matt/Development/openthrottle',
    id: '4f1f0a3a-0000-4000-8000-000000000001',
    label: 'monorepo',
    projectName: 'OpenThrottle',
    remoteUrl: 'git@github.com:visormatt/monorepo.git',
  },
  {
    branch: 'main',
    filesystemPath: '/Users/matt/Development/shiftsmart-monorepo',
    id: '4f1f0a3a-0000-4000-8000-000000000002',
    label: 'monorepo',
    remoteUrl: 'git@github.com:shiftsmartinc/monorepo.git',
  },
  {
    branch: 'develop',
    filesystemPath: '/Users/matt/Development/nativeapps',
    id: '4f1f0a3a-0000-4000-8000-000000000003',
    label: 'nativeapps',
    remoteUrl: 'git@github.com:shiftsmartinc/nativeapps.git',
  },
];

/** Ids of the checkouts a query keeps visible, in list order. */
const matching = (search: string): readonly string[] =>
  CHECKOUTS.filter(
    (checkout) =>
      checkoutSearchFilter(checkout.id, search, [
        ...checkoutSearchTerms(checkout),
      ]) > 0,
  ).map((checkout) => checkout.label);

describe('checkoutSearchFilter', () => {
  it('matches only the owner that actually contains the query', () => {
    // The bug: `visormatt` subsequence-matched `/Users/matt/…` on every row.
    expect(matching('visormatt')).toEqual(['monorepo']);
    expect(
      checkoutSearchFilter(CHECKOUTS[1].id, 'visormatt', [
        ...checkoutSearchTerms(CHECKOUTS[1]),
      ]),
    ).toBe(0);
  });

  it('keeps a name search spanning every org', () => {
    expect(matching('monorepo')).toEqual(['monorepo', 'monorepo']);
  });

  it('narrows to one checkout when every token has to match', () => {
    expect(matching('shiftsmartinc mono')).toEqual(['monorepo']);
  });

  it('matches path, branch and project names as substrings', () => {
    expect(matching('Development')).toHaveLength(3);
    expect(matching('develop')).toHaveLength(3);
    expect(matching('openthrottle')).toEqual(['monorepo']);
  });

  it('is case-insensitive', () => {
    expect(matching('VISORMATT')).toEqual(['monorepo']);
    expect(matching('NaTiVeApPs')).toEqual(['nativeapps']);
  });

  it('rejects garbage queries and subsequence-only matches', () => {
    expect(matching('zzzz')).toEqual([]);
    // `mnrp` is a subsequence of `monorepo` but not a substring.
    expect(matching('mnrp')).toEqual([]);
  });

  it('keeps every checkout when the query is empty or whitespace', () => {
    expect(matching('')).toHaveLength(3);
    expect(matching('   ')).toHaveLength(3);
  });

  it('ignores the value, so id fragments conjure no ghost matches', () => {
    expect(checkoutSearchFilter(CHECKOUTS[0].id, '4f1f0a3a', [])).toBe(0);
    expect(matching('4f1f0a3a')).toEqual([]);
  });

  it('scores a prefix match above a mid-term one', () => {
    const terms = [...checkoutSearchTerms(CHECKOUTS[2])];

    expect(checkoutSearchFilter('id', 'native', terms)).toBeGreaterThan(
      checkoutSearchFilter('id', 'apps', terms),
    );
  });

  it('scores nothing when a row carries no search terms', () => {
    expect(checkoutSearchFilter('id', 'monorepo', undefined)).toBe(0);
  });
});
