import * as React from 'react';

import type { SearchChunk } from '~/__generated__/graphql';
import { SearchResultTargetLink } from '~/routing/search/components/SearchResultTargetLink';
import { SEARCH_PREVIEW_COPY } from '~/routing/search/data/copy';
import { toSearchResultView } from '~/routing/search/utils/toSearchResultView';

export interface SearchResultsTableCellResultProps {
  /** Opens this result in the preview sheet; `trigger` gets focus back when it closes. */
  readonly onPreview: (
    result: SearchChunk,
    trigger: HTMLElement | null,
  ) => void;
  readonly result: SearchChunk;
}

/**
 * @description The Result cell: linked title, its context (a task's plan, a plan chunk's task,
 * a doc's repo) and a clamped snippet that opens the preview.
 */
export const SearchResultsTableCellResult = (
  props: SearchResultsTableCellResultProps,
): React.ReactElement => {
  const { onPreview, result } = props;

  // Hooks

  // Setup
  const view = toSearchResultView(result);

  // Handlers
  const handlePreview = (event: React.MouseEvent<HTMLButtonElement>): void => {
    onPreview(result, event.currentTarget);
  };

  // Markup
  const context = view.context !== null && (
    <SearchResultTargetLink
      className="min-w-0 truncate underline-offset-4 hover:underline"
      label={view.context.label}
      target={view.context.target}
      testId="SearchResultsTable-context"
    />
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex min-w-0 flex-col gap-1 p-2">
      <SearchResultTargetLink
        className="text-foreground min-w-0 truncate text-sm font-medium underline-offset-4 hover:underline"
        label={view.title}
        target={view.target}
        testId="SearchResultsTable-title"
      />
      <div className="text-muted-foreground flex min-w-0 text-xs">
        {context}
      </div>
      <button
        aria-label={`${SEARCH_PREVIEW_COPY.previewLabel}: ${view.title}`}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring line-clamp-2 rounded-sm text-left text-sm leading-relaxed whitespace-normal focus-visible:ring-2 focus-visible:outline-none"
        data-testid="SearchResultsTable-snippet"
        onClick={handlePreview}
        type="button"
      >
        {view.snippet}
      </button>
    </div>
  );
};
