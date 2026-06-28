import type { Document } from '@langchain/core/documents';
import { describe, expect, it } from 'vitest';

import { getMarkdownDocumentStats } from './markdown';

const makeDoc = (pageContent: string, source: string): Document => ({
  metadata: { source },
  pageContent,
});

describe('getMarkdownDocumentStats', () => {
  it('returns zeroed stats for an empty list', () => {
    const stats = getMarkdownDocumentStats([]);

    expect(stats).toEqual({
      averageDocumentLength: 0,
      sources: [],
      totalCharacters: 0,
      totalDocuments: 0,
    });
  });

  it('aggregates character counts and document totals', () => {
    const documents = [
      makeDoc('abc', 'a.md'), // 3 chars
      makeDoc('defghi', 'b.md'), // 6 chars
    ];

    const stats = getMarkdownDocumentStats(documents);

    expect(stats.totalDocuments).toBe(2);
    expect(stats.totalCharacters).toBe(9);
    expect(stats.averageDocumentLength).toBe(4.5);
  });

  it('does not divide by zero when computing the average for no documents', () => {
    expect(getMarkdownDocumentStats([]).averageDocumentLength).toBe(0);
  });

  it('deduplicates sources while preserving distinct entries', () => {
    const documents = [
      makeDoc('one', 'a.md'),
      makeDoc('two', 'a.md'),
      makeDoc('three', 'b.md'),
    ];

    const stats = getMarkdownDocumentStats(documents);

    expect(stats.sources).toEqual(['a.md', 'b.md']);
    expect(stats.totalDocuments).toBe(3);
  });

  it('counts empty page content as zero-length documents', () => {
    const documents = [makeDoc('', 'a.md'), makeDoc('', 'b.md')];

    const stats = getMarkdownDocumentStats(documents);

    expect(stats.totalCharacters).toBe(0);
    expect(stats.averageDocumentLength).toBe(0);
    expect(stats.totalDocuments).toBe(2);
  });
});
