import { cn } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SearchIcon } from 'lucide-react';
import * as React from 'react';

import { SEARCH_INTRODUCTION_COPY } from '~/routing/search/data/data.copy';

export interface SearchIntroductionProps {
  readonly className?: string;
  /** With a query the page shows results, so the first-visit hint is dropped. */
  readonly hasQuery: boolean;
}

export const SearchIntroduction = (
  props: SearchIntroductionProps,
): React.ReactElement => {
  const { className, hasQuery } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const emptyHint = (
    <p
      className="text-muted-foreground mt-1 text-sm"
      data-testid="SearchIntroduction-hint"
    >
      {SEARCH_INTRODUCTION_COPY.emptyHint}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('space-y-1', className)}
      data-testid="SearchIntroduction"
    >
      <GlobalHeading
        heading="h1"
        icon={SearchIcon}
        title={SEARCH_INTRODUCTION_COPY.title}
      />
      {hasQuery ? null : emptyHint}
    </div>
  );
};
