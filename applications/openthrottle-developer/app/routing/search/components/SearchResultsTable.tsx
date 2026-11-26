import type { DataTableRow } from '@openthrottle/react-router-shadcn';
import { cn, DataTable } from '@openthrottle/react-router-shadcn';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import * as React from 'react';

import type { SearchChunk } from '~/__generated__/graphql';
import { SEARCH_TABLE_COPY } from '~/routing/search/data/copy';
import { buildSearchTableColumns } from '~/routing/search/utils/buildSearchTableColumns';
import { isInteractiveTarget } from '~/routing/search/utils/isInteractiveTarget';

export interface SearchResultsTableProps {
  readonly className?: string;
  /** With no query the empty state prompts for one; with one it says nothing matched. */
  readonly hasQuery: boolean;
  /** Opens a result in the preview sheet; `trigger` gets focus back when it closes. */
  readonly onPreview: (
    result: SearchChunk,
    trigger: HTMLElement | null,
  ) => void;
  readonly results: readonly SearchChunk[];
}

export const SearchResultsTable = (
  props: SearchResultsTableProps,
): React.ReactElement => {
  const { className, hasQuery, onPreview, results } = props;

  // Hooks
  // Keyed on `onPreview` only: new column identities would remount every cell.
  const columns = React.useMemo(
    () => buildSearchTableColumns(onPreview),
    [onPreview],
  );

  // Setup
  const emptyCopy = hasQuery
    ? SEARCH_TABLE_COPY.empty.noResults
    : SEARCH_TABLE_COPY.empty.noQuery;
  const data = [...results];

  // Handlers
  // A click anywhere on a row previews it, except on the row's own links and controls.
  const getRowProps = React.useCallback(
    (row: DataTableRow<SearchChunk>) => {
      return {
        className: 'cursor-pointer',
        onClick: (event: React.MouseEvent<HTMLTableRowElement>) => {
          if (isInteractiveTarget(event.target)) {
            return;
          }

          onPreview(row.original, null);
        },
      };
    },
    [onPreview],
  );

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
      data-testid="SearchResultsTable"
    >
      <DataTable<SearchChunk, unknown>
        columns={columns}
        data={data}
        emptyState={emptyState}
        getRowId={(result) => result.id}
        getRowProps={getRowProps}
      />
    </div>
  );
};
