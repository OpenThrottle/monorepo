import {
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import type { SearchScopeValue } from '~/routing/search/config';
import { SEARCH_SCOPE } from '~/routing/search/config';
import { SEARCH_SCOPE_COPY } from '~/routing/search/data/copy';
import {
  buildSearchUrl,
  parseSearchScope,
  withStatsParam,
} from '~/routing/search/utils/parsers';

export interface SearchScopeToggleProps {
  readonly className?: string;
  /** The current query, kept when the scope changes so one search can be run on both corpora. */
  readonly query: string;
  readonly scope: SearchScopeValue;
}

/**
 * @description Knowledge ↔ Code switch. A change is a navigation (`?scope=code`), so the scope
 * is linkable; it keeps the query and starts again from page one.
 */
export const SearchScopeToggle = (
  props: SearchScopeToggleProps,
): React.ReactElement => {
  const { className, query, scope } = props;

  // Hooks
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Setup

  // Handlers
  const handleValueChange = (value: string): void => {
    // Radix reports '' when the active item is clicked again; the scope stays put.
    if (value === '' || value === scope) {
      return;
    }

    const url = buildSearchUrl(query, 1, undefined, {
      scope: parseSearchScope(value),
    });

    void navigate(withStatsParam(url, searchParams));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ToggleGroup
      aria-label={SEARCH_SCOPE_COPY.ariaLabel}
      className={className}
      data-testid="SearchScopeToggle"
      onValueChange={handleValueChange}
      size="sm"
      type="single"
      value={scope}
      variant="outline"
    >
      <ToggleGroupItem className="px-3" value={SEARCH_SCOPE.knowledge}>
        {SEARCH_SCOPE_COPY.knowledge}
      </ToggleGroupItem>
      <ToggleGroupItem className="px-3" value={SEARCH_SCOPE.code}>
        {SEARCH_SCOPE_COPY.code}
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
