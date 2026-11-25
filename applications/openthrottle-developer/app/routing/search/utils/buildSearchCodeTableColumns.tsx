/**
 * @description Column definitions for {@link SearchCodeResultsTable}: the match (path:lines and
 * a snippet), its similarity score and the per-row actions menu.
 */

import type { DataTableColumnDef } from '@openthrottle/react-router-shadcn';
import { GlobalPopoverActionsHeader } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type {
  SearchCodeMatchFragment,
  SearchCodeRepositoryFragment,
} from '~/__generated__/graphql';
import { SearchCodeTableCellActions } from '~/routing/search/components/SearchCodeTableCellActions';
import { SEARCH_CODE_COPY } from '~/routing/search/data/copy';

export const buildSearchCodeTableColumns = (
  repository: SearchCodeRepositoryFragment,
): DataTableColumnDef<SearchCodeMatchFragment, unknown>[] => {
  return [
    {
      cell: ({ row }) => {
        const { content, endLine, path, startLine } = row.original;

        return (
          <div className="flex min-w-0 flex-col gap-1 p-2">
            <div
              className="flex min-w-0 font-mono text-sm"
              data-testid="SearchCodeResultsTable-location"
            >
              <span className="text-foreground truncate font-medium">
                {path}
              </span>
              <span className="text-muted-foreground shrink-0">
                :{startLine}–{endLine}
              </span>
            </div>
            <div className="bg-muted/40 rounded-sm p-2">
              <pre
                className="text-muted-foreground line-clamp-4 overflow-hidden font-mono text-xs whitespace-pre-wrap"
                data-testid="SearchCodeResultsTable-snippet"
              >
                {content}
              </pre>
            </div>
          </div>
        );
      },
      header: () => {
        return (
          <div className="p-2">{SEARCH_CODE_COPY.table.columns.match}</div>
        );
      },
      id: 'match',
    },
    {
      cell: ({ row }) => {
        const percent = Math.round(row.original.score * 100);

        return (
          <div
            className="text-muted-foreground p-2 text-right text-sm tabular-nums"
            data-testid="SearchCodeResultsTable-score"
          >
            {percent}%
          </div>
        );
      },
      header: () => {
        return (
          <div className="p-2 text-right">
            {SEARCH_CODE_COPY.table.columns.score}
          </div>
        );
      },
      id: 'score',
    },
    {
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center">
            <SearchCodeTableCellActions
              match={row.original}
              repository={repository}
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
