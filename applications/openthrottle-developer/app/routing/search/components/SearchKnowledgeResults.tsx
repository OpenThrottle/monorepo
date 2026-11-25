import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import * as React from 'react';

import type { SearchChunk } from '~/__generated__/graphql';
import { GlobalSemanticSearchOffNotice } from '~/global/components/GlobalSemanticSearchOffNotice';
import { SearchResultPreview } from '~/routing/search/components/SearchResultPreview';
import { SearchResultsTable } from '~/routing/search/components/SearchResultsTable';
import {
  SEARCH_BASE_PATH,
  SEARCH_LIMIT_OPTIONS,
} from '~/routing/search/config';
import { SEARCH_PAGINATION_COPY } from '~/routing/search/data/copy';
import type { SearchIndexKnowledgeData } from '~/routing/search/types/search-index';

export interface SearchKnowledgeResultsProps {
  readonly data: SearchIndexKnowledgeData;
  /** Power-user mode: ranking details start open in the preview and stay on in page links. */
  readonly expandRankingDetails: boolean;
  readonly query: string;
}

/**
 * @description The knowledge scope's results: the keyword-fallback notice, the results table, the
 * preview sheet it opens, and pagination.
 */
export const SearchKnowledgeResults = (
  props: SearchKnowledgeResultsProps,
): React.ReactElement => {
  const { data, expandRankingDetails, query } = props;
  const { limit, page, results, total } = data;

  // Hooks
  const [previewResult, setPreviewResult] = React.useState<SearchChunk | null>(
    null,
  );
  const previewTriggerRef = React.useRef<HTMLElement | null>(null);

  // Setup
  const previewIndex = results.chunks.findIndex((chunk) => {
    return chunk.id === previewResult?.id;
  });
  const isPreviewOnPage = previewIndex >= 0;
  const previewRankMeta = isPreviewOnPage
    ? { indexOnPage: previewIndex, page, pageSize: limit, total }
    : undefined;

  // Handlers
  // Stable, so the results table keeps its column (and cell) identities across renders.
  const handlePreview = React.useCallback(
    (result: SearchChunk, trigger: HTMLElement | null): void => {
      previewTriggerRef.current = trigger;
      setPreviewResult(result);
    },
    [],
  );

  const handleClosePreview = (): void => {
    setPreviewResult(null);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <GlobalSemanticSearchOffNotice reason={results.reason} />
      <SearchResultsTable
        hasQuery={query.trim() !== ''}
        onPreview={handlePreview}
        results={results.chunks}
      />
      <SearchResultPreview
        defaultOpenWhy={expandRankingDetails}
        onClose={handleClosePreview}
        rankMeta={previewRankMeta}
        result={previewResult}
        returnFocusTo={previewTriggerRef.current}
      />
      <OpenThrottlePagination
        basePath={SEARCH_BASE_PATH}
        className="mt-2"
        details={expandRankingDetails ? 'ranking' : undefined}
        limit={limit}
        page={page}
        pageSize={{
          label: SEARCH_PAGINATION_COPY.pageSizeLabel,
          options: SEARCH_LIMIT_OPTIONS,
        }}
        resultLabel={SEARCH_PAGINATION_COPY.resultLabel}
        search={query || undefined}
        total={total}
      />
    </>
  );
};
