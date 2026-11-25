import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@openthrottle/react-router-shadcn';
import { ExternalLinkIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { SearchChunk } from '~/__generated__/graphql';
import { SearchWhyThisResult } from '~/routing/search/components/SearchWhyThisResult';
import {
  SEARCH_PREVIEW_COPY,
  SEARCH_RESULT_COPY,
} from '~/routing/search/data/copy';
import { SEARCH_SOURCE_PILL_COLORS } from '~/routing/search/data/source-pills';
import type { SearchRankMeta } from '~/routing/search/types/search-rank-meta';
import { toSearchResultView } from '~/routing/search/utils/toSearchResultView';

export interface SearchResultPreviewProps {
  /** Power-user mode (`details=ranking`): ranking details start expanded. */
  readonly defaultOpenWhy: boolean;
  readonly onClose: () => void;
  readonly rankMeta: SearchRankMeta | undefined;
  /** The result being previewed; `null` keeps the sheet closed. */
  readonly result: SearchChunk | null;
  /** The control that opened the preview. The sheet has no Radix trigger, so focus is handed back by hand. */
  readonly returnFocusTo: HTMLElement | null;
}

/**
 * @description Side sheet that shows a whole search result — full content, ranking details
 * and the way out — so a user can judge it before leaving /search. Local state only: opening
 * and closing never navigates, so the search loader never re-runs.
 */
export const SearchResultPreview = (
  props: SearchResultPreviewProps,
): React.ReactElement => {
  const { defaultOpenWhy, onClose, rankMeta, result, returnFocusTo } = props;

  // Hooks

  // Setup
  const isOpen = result !== null;

  // Handlers
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      onClose();
    }
  };

  const handleCloseAutoFocus = (event: Event): void => {
    if (returnFocusTo?.isConnected === true) {
      event.preventDefault();
      returnFocusTo.focus();
    }
  };

  const renderBody = (chunk: SearchChunk): React.ReactNode => {
    const view = toSearchResultView(chunk);
    const openLabel = SEARCH_PREVIEW_COPY.open[view.source];
    let openAction: React.ReactNode = null;

    if (view.target.kind === 'internal') {
      openAction = (
        <Button asChild={true} data-testid="SearchResultPreview-open">
          <Link prefetch="intent" to={view.target.href}>
            {openLabel}
          </Link>
        </Button>
      );
    }

    if (view.target.kind === 'external') {
      openAction = (
        <Button asChild={true} data-testid="SearchResultPreview-open">
          <a href={view.target.href} rel="noopener noreferrer" target="_blank">
            {openLabel}
            <ExternalLinkIcon aria-hidden={true} className="size-4" />
          </a>
        </Button>
      );
    }

    return (
      <>
        <SheetHeader className="gap-2 text-left">
          <Badge color={SEARCH_SOURCE_PILL_COLORS[view.source]} size="xs">
            {view.source}
          </Badge>
          <SheetTitle className="leading-snug">{view.title}</SheetTitle>
          <SheetDescription>
            {view.context == null ? null : `${view.context.label} · `}
            {SEARCH_RESULT_COPY.relevance} {view.relevancePercent}%
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          <p
            className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap"
            data-testid="SearchResultPreview-content"
          >
            {chunk.content}
          </p>
          <SearchWhyThisResult
            defaultOpen={defaultOpenWhy}
            rankMeta={rankMeta}
            result={chunk}
          />
        </div>
        <SheetFooter className="flex-row items-center justify-between border-t">
          <span className="text-muted-foreground text-xs">
            {SEARCH_PREVIEW_COPY.closeHint}
          </span>
          {openAction}
        </SheetFooter>
      </>
    );
  };

  // Markup
  const body = result === null ? null : renderBody(result);

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Sheet onOpenChange={handleOpenChange} open={isOpen}>
      <SheetContent
        className="flex w-full flex-col gap-4 sm:max-w-xl"
        data-testid="SearchResultPreview"
        onCloseAutoFocus={handleCloseAutoFocus}
        side="right"
      >
        {body}
      </SheetContent>
    </Sheet>
  );
};
