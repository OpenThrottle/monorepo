import { OpenThrottlePagination } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { SearchCodeNotice } from '~/routing/search/components/SearchCodeNotice';
import { SearchCodeResultsTable } from '~/routing/search/components/SearchCodeResultsTable';
import {
  SEARCH_BASE_PATH,
  SEARCH_LIMIT_OPTIONS,
} from '~/routing/search/config';
import {
  SEARCH_CODE_COPY,
  SEARCH_PAGINATION_COPY,
} from '~/routing/search/data/copy';
import type { SearchIndexCodeData } from '~/routing/search/types/search-index';

export interface SearchCodeResultsProps {
  readonly data: SearchIndexCodeData;
  readonly query: string;
}

/**
 * @description The code scope's results: the index-state notice, the matches table, and
 * pagination that keeps the scope and repository.
 */
export const SearchCodeResults = (
  props: SearchCodeResultsProps,
): React.ReactElement => {
  const { data, query } = props;
  const { code, limit, page, total } = data;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const table = code.repository !== null && (
    <SearchCodeResultsTable
      hasQuery={query.trim() !== ''}
      matches={code.matches}
      repository={code.repository}
    />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <SearchCodeNotice available={code.available} index={code.index} />
      {table}
      <OpenThrottlePagination
        basePath={SEARCH_BASE_PATH}
        className="mt-2"
        limit={limit}
        page={page}
        pageSize={{
          label: SEARCH_PAGINATION_COPY.pageSizeLabel,
          options: SEARCH_LIMIT_OPTIONS,
        }}
        // `scope` and `repositoryId` live only in the URL, so clone the live query string.
        preserveSearchParams={true}
        resultLabel={SEARCH_CODE_COPY.pagination.resultLabel}
        total={total}
      />
    </>
  );
};
