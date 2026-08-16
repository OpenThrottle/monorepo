import * as React from 'react';
import clsx from 'clsx';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  LEGACY_SEARCH_PARAM_KEY,
  SEARCH_PARAM_KEY,
} from '@openthrottle/react-router-ui-global';
import { useSearchParams } from 'react-router';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';

export interface RepositoriesTableEmptyProps {
  className?: string;
}

/**
 * @description No-results rendering for a search that matched nothing. Distinct
 * from the zero-repositories onboarding block: someone who simply typed a bad
 * query gets a way back rather than a first-run tutorial.
 */
export const RepositoriesTableEmpty = (
  props: RepositoriesTableEmptyProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup

  // Handlers
  const handleClearSearch = React.useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete(SEARCH_PARAM_KEY);
    next.delete(LEGACY_SEARCH_PARAM_KEY);
    next.delete('page');

    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-col items-center gap-2', className)}
      data-testid="RepositoriesTableEmpty"
    >
      <p className="text-muted-foreground text-sm">
        {REPOSITORIES_TABLE_COPY.noResults}
      </p>
      <Button onClick={handleClearSearch} size="xs" variant="outline">
        {REPOSITORIES_TABLE_COPY.clearSearch}
      </Button>
    </div>
  );
};
