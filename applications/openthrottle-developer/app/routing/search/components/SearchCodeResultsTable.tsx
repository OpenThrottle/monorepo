import { cn, DataTable } from '@openthrottle/react-router-shadcn';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import * as React from 'react';

import type {
  SearchCodeMatchFragment,
  SearchCodeRepositoryFragment,
} from '~/__generated__/graphql';
import { SEARCH_CODE_COPY } from '~/routing/search/data/copy';
import { SEARCH_CODE_TABLE_CLASS } from '~/routing/search/data/search-table';
import { buildSearchCodeTableColumns } from '~/routing/search/utils/buildSearchCodeTableColumns';

export interface SearchCodeResultsTableProps {
  readonly className?: string;
  readonly hasQuery: boolean;
  readonly matches: readonly SearchCodeMatchFragment[];
  readonly repository: SearchCodeRepositoryFragment;
}

export const SearchCodeResultsTable = (
  props: SearchCodeResultsTableProps,
): React.ReactElement => {
  const { className, hasQuery, matches, repository } = props;

  // Hooks
  const columns = React.useMemo(
    () => buildSearchCodeTableColumns(repository),
    [repository],
  );

  // Setup
  const emptyCopy = hasQuery
    ? SEARCH_CODE_COPY.table.empty.noResults
    : SEARCH_CODE_COPY.table.empty.noQuery;
  const data = [...matches];

  // Handlers

  // Markup
  const emptyState = (
    <OpenThrottleEmptyState
      description={emptyCopy.description}
      title={emptyCopy.title}
    />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('ui-border rounded-lg border', className)}
      data-testid="SearchCodeResultsTable"
    >
      <DataTable<SearchCodeMatchFragment, unknown>
        className={SEARCH_CODE_TABLE_CLASS}
        columns={columns}
        data={data}
        emptyState={emptyState}
        getRowId={(match) => `${match.path}:${match.startLine}`}
      />
    </div>
  );
};
