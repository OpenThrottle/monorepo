/**
 * @description Column definitions for {@link SearchResultsTable}: type pill, result (title,
 * context, snippet), relevance and the per-row actions menu.
 */

import type { DataTableColumnDef } from '@openthrottle/react-router-shadcn';
import { Badge } from '@openthrottle/react-router-shadcn';
import { GlobalPopoverActionsHeader } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type { SearchChunk } from '~/__generated__/graphql';
import { SearchResultsTableCellActions } from '~/routing/search/components/SearchResultsTableCellActions';
import { SearchResultsTableCellResult } from '~/routing/search/components/SearchResultsTableCellResult';
import { SEARCH_TABLE_COPY } from '~/routing/search/data/copy';
import { SEARCH_SOURCE_PILL_COLORS } from '~/routing/search/data/source-pills';
import { normalizeSource } from '~/routing/search/utils/normalizeSource';

export const buildSearchTableColumns = (
  onPreview: (result: SearchChunk, trigger: HTMLElement | null) => void,
): DataTableColumnDef<SearchChunk, unknown>[] => {
  return [
    {
      cell: ({ row }) => {
        const source = normalizeSource(row.original.source);

        return (
          <div className="p-2">
            <Badge
              color={SEARCH_SOURCE_PILL_COLORS[source]}
              data-testid="SearchResultsTable-pill"
              size="xs"
            >
              {source}
            </Badge>
          </div>
        );
      },
      header: () => {
        return <div className="p-2">{SEARCH_TABLE_COPY.columns.type}</div>;
      },
      id: 'type',
    },
    {
      cell: ({ row }) => {
        return (
          <SearchResultsTableCellResult
            onPreview={onPreview}
            result={row.original}
          />
        );
      },
      header: () => {
        return <div className="p-2">{SEARCH_TABLE_COPY.columns.result}</div>;
      },
      id: 'result',
    },
    {
      cell: ({ row }) => {
        const percent = Math.round(row.original.similarity * 100);

        return (
          <div
            className="text-muted-foreground p-2 text-right text-sm tabular-nums"
            data-testid="SearchResultsTable-relevance"
          >
            {percent}%
          </div>
        );
      },
      header: () => {
        return (
          <div className="p-2 text-right">
            {SEARCH_TABLE_COPY.columns.relevance}
          </div>
        );
      },
      id: 'relevance',
    },
    {
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center">
            <SearchResultsTableCellActions
              onPreview={onPreview}
              result={row.original}
            />
          </div>
        );
      },
      header: () => {
        return <GlobalPopoverActionsHeader />;
      },
      id: 'actions',
    },
  ];
};
