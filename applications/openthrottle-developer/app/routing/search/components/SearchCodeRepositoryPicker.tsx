import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import type { SearchCodeRepositoryFragment } from '~/__generated__/graphql';
import { SEARCH_SCOPE } from '~/routing/search/config';
import { SEARCH_SCOPE_COPY } from '~/routing/search/data/copy';
import { buildSearchUrl, withStatsParam } from '~/routing/search/utils/parsers';

export interface SearchCodeRepositoryPickerProps {
  readonly query: string;
  readonly repositories: readonly SearchCodeRepositoryFragment[];
  readonly selected: SearchCodeRepositoryFragment;
}

/** @description Picks which registered repository code search runs against; a change navigates. */
export const SearchCodeRepositoryPicker = (
  props: SearchCodeRepositoryPickerProps,
): React.ReactElement => {
  const { query, repositories, selected } = props;

  // Hooks
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Setup

  // Handlers
  const handleValueChange = (repositoryId: string): void => {
    const url = buildSearchUrl(query, 1, undefined, {
      repositoryId,
      scope: SEARCH_SCOPE.code,
    });

    void navigate(withStatsParam(url, searchParams));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Select onValueChange={handleValueChange} value={selected.id}>
      <SelectTrigger
        aria-label={SEARCH_SCOPE_COPY.repositoryLabel}
        className="h-8 w-full sm:w-56"
        data-testid="SearchCodeRepositoryPicker"
      >
        <SelectValue>{selected.displayName}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {repositories.map((repository) => {
          return (
            <SelectItem key={repository.id} value={repository.id}>
              {repository.displayName}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};
