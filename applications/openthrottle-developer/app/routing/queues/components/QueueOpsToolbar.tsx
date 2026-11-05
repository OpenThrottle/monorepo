import type { FacetedFilterOption } from '@openthrottle/react-router-shadcn';
import { Button, cn, FacetedFilter } from '@openthrottle/react-router-shadcn';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { RefreshCwIcon } from 'lucide-react';
import * as React from 'react';
import { useRevalidator, useSearchParams } from 'react-router';

import { QUEUE_STATE_FILTER_COPY } from '~/routing/queues/data/data.copy';
import {
  QUEUE_JOB_STATE_DOT_COLOR,
  QUEUE_JOB_STATE_DOT_FALLBACK,
} from '~/routing/queues/data/data.queue-job-state-dot-color';
import { queueJobStateLabel } from '~/routing/queues/utils/queue-job-state';

export interface QueueOpsToolbarProps {
  /** Right-aligned slot for route-specific actions (Create queue, pause/resume, …). */
  actions?: React.ReactNode;
  className?: string;
  searchAriaLabel?: string;
  searchPlaceholder?: string;
  /** When provided, renders a job-state filter bound to the `state` search param. */
  stateOptions?: readonly string[];
}

/**
 * @description Live ops toolbar: URL-driven search (search), optional job-state filter (state), and a Refresh that revalidates the route.
 */
export const QueueOpsToolbar = (
  props: QueueOpsToolbarProps,
): React.ReactElement => {
  const {
    actions,
    className,
    searchAriaLabel = 'Search queues',
    searchPlaceholder = 'Search',
    stateOptions,
  } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();

  // Setup
  const states = searchParams.getAll('state');
  const isRefreshing = revalidator.state === 'loading';
  const dotColors = new Map(Object.entries(QUEUE_JOB_STATE_DOT_COLOR));
  const filterOptions: FacetedFilterOption[] = (stateOptions ?? []).map(
    (state) => ({
      adornment: (
        <span
          aria-hidden={true}
          className={cn(
            'size-2 shrink-0 rounded-full',
            dotColors.get(state) ?? QUEUE_JOB_STATE_DOT_FALLBACK,
          )}
        />
      ),
      count: undefined,
      group: undefined,
      label: queueJobStateLabel(state),
      value: state,
    }),
  );

  // Handlers
  const handleStateChange = React.useCallback(
    (nextStates: string[]) => {
      const next = new URLSearchParams(searchParams);
      next.delete('state');
      for (const state of nextStates) {
        next.append('state', state);
      }
      next.set('page', '1');

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleRefresh = React.useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('w-full', className)} data-testid="QueueOpsToolbar">
      <div className="flex w-full flex-wrap items-center gap-2">
        <GlobalToolbarSearch
          aria-label={searchAriaLabel}
          placeholder={searchPlaceholder}
          transformCommittedParams={(next) => {
            next.delete('q');
            next.delete('page');
          }}
        />

        {filterOptions.length > 0 && (
          <div data-testid="QueueOpsToolbar-state-filter">
            <FacetedFilter
              footerActions={[
                {
                  disabled: states.length === 0,
                  label: QUEUE_STATE_FILTER_COPY.allStates,
                  onSelect: () => handleStateChange([]),
                },
              ]}
              maxBadges={2}
              onChange={handleStateChange}
              options={filterOptions}
              searchable={false}
              title={QUEUE_STATE_FILTER_COPY.title}
              value={states}
            />
          </div>
        )}

        <Button
          aria-label="Refresh"
          onClick={handleRefresh}
          type="button"
          variant="outline"
        >
          <RefreshCwIcon
            className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
          />
          Refresh
        </Button>

        <div className="min-w-0 flex-1" />
        {actions}
      </div>
    </div>
  );
};
