import { Badge, Button, Card, cn } from '@openthrottle/react-router-shadcn';
import { PanelRightOpenIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { SearchChunk } from '~/__generated__/graphql';
import {
  SEARCH_PREVIEW_COPY,
  SEARCH_RESULT_COPY,
} from '~/routing/search/data/copy';
import { SEARCH_SOURCE_PILL_COLORS } from '~/routing/search/data/source-pills';
import type { SearchResultTarget } from '~/routing/search/types/search-result-view';
import { toSearchResultView } from '~/routing/search/utils/toSearchResultView';

export interface SearchCardProps {
  readonly className?: string;
  /** Opens this result in the preview sheet; `trigger` gets focus back when it closes. */
  readonly onPreview: (result: SearchChunk, trigger: HTMLElement) => void;
  readonly result: SearchChunk;
}

/**
 * @description One search result. Plans, tasks and documentation share a single layout:
 * pill + linked title on one row, then a meta line (context link · relevance), then a
 * clamped snippet. The snippet and the preview button open the full result in a side sheet.
 */
export const SearchCard = (props: SearchCardProps): React.ReactElement => {
  const { className, onPreview, result } = props;

  // Hooks

  // Setup
  const view = toSearchResultView(result);

  // Handlers
  const handlePreview = (event: React.MouseEvent<HTMLButtonElement>): void => {
    onPreview(result, event.currentTarget);
  };

  const renderTarget = (
    target: SearchResultTarget,
    label: string,
    testId: string,
    linkClassName: string,
  ): React.ReactNode => {
    if (target.kind === 'internal') {
      return (
        <Link
          className={linkClassName}
          data-testid={testId}
          prefetch="intent"
          to={target.href}
        >
          {label}
        </Link>
      );
    }

    if (target.kind === 'external') {
      return (
        <a
          className={linkClassName}
          data-testid={testId}
          href={target.href}
          rel="noopener noreferrer"
          target="_blank"
        >
          {label}
        </a>
      );
    }

    return (
      <span className={linkClassName} data-testid={testId}>
        {label}
      </span>
    );
  };

  const renderContext = (): React.ReactNode => {
    if (view.context == null) {
      return null;
    }

    return renderTarget(
      view.context.target,
      view.context.label,
      'SearchCard-context',
      'min-w-0 truncate underline-offset-4 hover:underline',
    );
  };

  // Markup
  const title = renderTarget(
    view.target,
    view.title,
    'SearchCard-title',
    'text-foreground min-w-0 truncate font-medium underline-offset-4 hover:underline',
  );
  const context = renderContext();
  const separator = context == null ? null : <span aria-hidden={true}>·</span>;
  const meta = (
    <div
      className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs"
      data-testid="SearchCard-meta"
    >
      {context}
      {separator}
      <span className="shrink-0" data-testid="SearchCard-relevance">
        {SEARCH_RESULT_COPY.relevance} {view.relevancePercent}%
      </span>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={cn('gap-1.5 px-4 py-3', className)}
      data-source={view.source}
      data-testid="SearchCard"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Badge
          className="shrink-0"
          color={SEARCH_SOURCE_PILL_COLORS[view.source]}
          data-testid="SearchCard-pill"
          size="xs"
        >
          {view.source}
        </Badge>
        {title}
        <Button
          aria-label={`${SEARCH_PREVIEW_COPY.previewLabel}: ${view.title}`}
          className="text-muted-foreground ml-auto size-7 shrink-0"
          data-testid="SearchCard-preview"
          onClick={handlePreview}
          size="icon"
          type="button"
          variant="ghost"
        >
          <PanelRightOpenIcon aria-hidden={true} className="size-4" />
        </Button>
      </div>
      {meta}
      <button
        aria-label={`${SEARCH_PREVIEW_COPY.previewLabel}: ${view.title}`}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring line-clamp-3 rounded-sm text-left text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none"
        data-testid="SearchCard-content"
        onClick={handlePreview}
        type="button"
      >
        {view.snippet}
      </button>
    </Card>
  );
};
