import { describe, expect, test } from 'vitest';

import { SEARCH_STATS_COPY } from '~/routing/search/data/copy';

import {
  getCorpusCount,
  getLexicalReasonLabel,
  getSearchModeLabel,
} from '../search-stats';

describe('getSearchModeLabel', () => {
  test('labels a known mode', () => {
    expect(getSearchModeLabel('lexical')).toBe(SEARCH_STATS_COPY.mode.lexical);
  });

  test('passes an unknown mode through', () => {
    expect(getSearchModeLabel('future')).toBe('future');
  });
});

describe('getLexicalReasonLabel', () => {
  test('is undefined without a reason', () => {
    expect(getLexicalReasonLabel(null)).toBeUndefined();
    expect(getLexicalReasonLabel('')).toBeUndefined();
  });

  test('labels a known reason', () => {
    expect(getLexicalReasonLabel('no_embeddings')).toBe(
      SEARCH_STATS_COPY.reason.no_embeddings,
    );
  });

  test('passes an unknown reason through', () => {
    expect(getLexicalReasonLabel('mystery')).toBe('mystery');
  });
});

describe('getCorpusCount', () => {
  const coverage = [
    {
      __typename: 'EmbeddingCoverageObject' as const,
      embedded: 2,
      entity: 'task',
      total: 3,
    },
  ];

  test('reads the entity row', () => {
    expect(getCorpusCount(coverage, 'task')).toEqual({ embedded: 2, total: 3 });
  });

  test('is zero for a missing entity', () => {
    expect(getCorpusCount(coverage, 'code')).toEqual({ embedded: 0, total: 0 });
  });
});
