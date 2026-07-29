import { describe, expect, test } from 'vitest';
import { docEntryHref, searchDocEntries } from '../searchDocs';
import type { DocEntry } from '../buildDocsManifest';

const entry = (overrides: Partial<DocEntry>): DocEntry => ({
  content: '',
  description: null,
  draft: false,
  group: 'General',
  order: 1,
  path: '/docs',
  section: 'docs',
  slug: '',
  title: 'Untitled',
  ...overrides,
});

const gettingStarted = entry({
  content: 'Run pnpm nx run openthrottle-developer:dev to start.',
  description: 'Run the developer app locally.',
  path: '/docs/getting-started',
  slug: 'getting-started',
  title: 'Getting Started',
});

const architecture = entry({
  content: 'OpenThrottle is an Nx and pnpm monorepo layout.',
  path: '/docs/architecture',
  slug: 'architecture',
  title: 'Architecture overview',
});

const faqWhat = entry({
  content: 'It does task running and package publishing.',
  group: 'General',
  path: '/faq',
  section: 'faq',
  slug: 'what-is-openthrottle',
  title: 'What is OpenThrottle?',
});

const manifest: readonly DocEntry[] = [gettingStarted, architecture, faqWhat];

describe('docEntryHref', () => {
  test('docs entries link to their route path', () => {
    expect(docEntryHref(gettingStarted)).toBe('/docs/getting-started');
  });

  test('faq entries deep-link to the /faq anchor', () => {
    expect(docEntryHref(faqWhat)).toBe('/faq#what-is-openthrottle');
  });

  test('a slug-less faq entry links to /faq', () => {
    expect(docEntryHref(entry({ section: 'faq', slug: '' }))).toBe('/faq');
  });
});

describe('searchDocEntries', () => {
  test('matches on title', () => {
    const results = searchDocEntries(manifest, 'getting');
    expect(results.map((r) => r.title)).toEqual(['Getting Started']);
  });

  test('matches FAQ content across sections', () => {
    const results = searchDocEntries(manifest, 'publishing');
    expect(results).toHaveLength(1);
    expect(results[0].section).toBe('faq');
  });

  test('matches on body content only', () => {
    const results = searchDocEntries(manifest, 'monorepo');
    expect(results.map((r) => r.title)).toEqual(['Architecture overview']);
  });

  test('ranks a title hit above a content-only hit', () => {
    // "architecture" is a title word for one entry; add another whose body
    // mentions it, and expect the title hit first.
    const bodyMention = entry({
      content: 'See the architecture doc for details.',
      path: '/docs/deploy',
      slug: 'deploy',
      title: 'Deploy',
    });
    const results = searchDocEntries(
      [bodyMention, architecture],
      'architecture',
    );
    expect(results.map((r) => r.title)).toEqual([
      'Architecture overview',
      'Deploy',
    ]);
  });

  test('requires every token to appear', () => {
    expect(searchDocEntries(manifest, 'getting monorepo')).toEqual([]);
  });

  test('returns nothing for a no-match query', () => {
    expect(searchDocEntries(manifest, 'zzzznope')).toEqual([]);
  });

  test('empty query returns the manifest head', () => {
    expect(searchDocEntries(manifest, '   ')).toEqual(manifest);
  });

  test('respects the limit', () => {
    expect(searchDocEntries(manifest, '', 1)).toHaveLength(1);
  });
});
