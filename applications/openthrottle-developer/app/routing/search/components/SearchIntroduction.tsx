import { cn } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SearchIcon } from 'lucide-react';
import * as React from 'react';

import { SEARCH_INTRODUCTION_COPY } from '~/routing/search/data/copy';

export interface SearchIntroductionProps {
  /** Right-aligned beside the heading; the route puts the scope toggle here. */
  readonly actions: React.ReactNode;
  readonly className?: string;
}

export const SearchIntroduction = (
  props: SearchIntroductionProps,
): React.ReactElement => {
  const { actions, className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)} data-testid="SearchIntroduction">
      <div className="mb-4 flex items-center justify-between gap-4">
        <GlobalHeading
          heading="h1"
          icon={SearchIcon}
          title={SEARCH_INTRODUCTION_COPY.title}
        />
        <div data-testid="SearchIntroduction-actions">{actions}</div>
      </div>
      <p
        className="text-muted-foreground text-sm"
        data-testid="SearchIntroduction-description"
      >
        {SEARCH_INTRODUCTION_COPY.description}
      </p>
    </div>
  );
};
