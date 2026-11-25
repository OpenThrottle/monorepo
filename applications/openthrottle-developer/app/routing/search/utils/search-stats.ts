import type { SearchCorpusCoverageFragment } from '~/__generated__/graphql';
import { SEARCH_STATS_COPY } from '~/routing/search/data/copy';

/** Embedding coverage for one entity, zero when the server reports none for it. */
export interface SearchCorpusCount {
  readonly embedded: number;
  readonly total: number;
}

/**
 * @description The label for a search result's ranking mode; an unknown mode renders as the
 * server sent it.
 */
export const getSearchModeLabel = (mode: string): string => {
  if (mode === 'hybrid' || mode === 'lexical' || mode === 'semantic') {
    return SEARCH_STATS_COPY.mode[mode];
  }

  return mode;
};

/**
 * @description Why a result fell back to keywords, as a sentence; undefined when there is no
 * reason. An unknown reason renders as the server sent it.
 */
export const getLexicalReasonLabel = (
  reason: string | null,
): string | undefined => {
  if (reason === null || reason === '') {
    return undefined;
  }

  const labels: Readonly<Record<string, string>> = SEARCH_STATS_COPY.reason;

  return labels[reason] ?? reason;
};

/** @description The embedded / total count for one entity from the server's coverage rows. */
export const getCorpusCount = (
  coverage: readonly SearchCorpusCoverageFragment[],
  entity: string,
): SearchCorpusCount => {
  const row = coverage.find((item) => {
    return item.entity === entity;
  });

  return { embedded: row?.embedded ?? 0, total: row?.total ?? 0 };
};
