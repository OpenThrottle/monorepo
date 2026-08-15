import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { RefreshCwIcon } from 'lucide-react';
import { useRevalidator, useSearchParams } from 'react-router';
import clsx from 'clsx';
import { StatusMultiSelect } from '~/routing/plans/components/StatusMultiSelect';

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
    <div className={clsx('w-full', className)} data-testid="QueueOpsToolbar">
      <div className="flex w-full flex-wrap items-center gap-2">
        <GlobalToolbarSearch
          aria-label={searchAriaLabel}
          placeholder={searchPlaceholder}
          transformCommittedParams={(next) => {
            next.delete('q');
            next.delete('page');
          }}
        />

        {stateOptions && stateOptions.length > 0 ? (
          <StatusMultiSelect
            compact={true}
            data-testid="QueueOpsToolbar-state-filter"
            onChange={handleStateChange}
            options={stateOptions}
            value={states}
          />
        ) : null}

        <Button
          aria-label="Refresh"
          onClick={handleRefresh}
          type="button"
          variant="outline"
        >
          <RefreshCwIcon
            className={clsx('h-4 w-4', isRefreshing && 'animate-spin')}
          />
          Refresh
        </Button>

        <div className="min-w-0 flex-1" />
        {actions}
      </div>
    </div>
  );
};
