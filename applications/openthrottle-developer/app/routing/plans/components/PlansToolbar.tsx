import * as React from 'react';
import clsx from 'clsx';
import { AssigneeMultiSelect } from '~/routing/plans/components/AssigneeMultiSelect';
import { GlobalToolbarSearch } from '@openthrottle/react-router-ui-global';
import { PlansSortBy, PlansSortOrder } from '~/routing/plans/config/types';
import { SortDropdown } from '~/routing/plans/components/SortDropdown';
import { STATUS_OPTIONS } from '~/routing/plans/config/status-options';
import { StatusMultiSelect } from '~/routing/plans/components/StatusMultiSelect';
import { usePlansToolbar } from '~/routing/plans/hooks/usePlansToolbar';

export interface PlansToolbarProps {
  assigneeOptions: string[];
  assignees: string[];
  className?: string;
  limit: number;
  page: number;
  sortBy: PlansSortBy;
  sortOrder: PlansSortOrder;
  statuses: string[];
  view: 'card' | 'table';
}

/**
 * @description Single-row compact toolbar: URL-driven search (q), semantic switch, status toggle group, assignee dropdown, sort dropdown. Preserves role=search, data-testid, and URL-driven state. There is no create action — plans are authored through the OpenThrottle MCP.
 */
export const PlansToolbar = (props: PlansToolbarProps): React.ReactElement => {
  const {
    assigneeOptions,
    assignees,
    className,
    limit,
    page,
    sortBy,
    sortOrder,
    statuses,
  } = props;

  // Hooks
  const { handleAssigneeChange, handleSortChange, handleStatusChange } =
    usePlansToolbar({ limit, page });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('w-full', className)} data-testid="PlansToolbar">
      {/* GlobalToolbarSearch owns the only <form role="search"> here; the
          status/assignee/sort filters are siblings outside it so no forms
          nest. Search commits ?search= and resets ?page (dropping the legacy
          ?q, and ?semantic when the query is cleared). */}
      <div className={clsx('flex w-full flex-wrap items-center', 'gap-2')}>
        <GlobalToolbarSearch
          aria-label="Search plans"
          placeholder="Search plans & tasks"
          transformCommittedParams={(next) => {
            next.delete('q');
            next.delete('page');
            if (!next.get('search')) {
              next.delete('semantic');
            }
          }}
        />

        <StatusMultiSelect
          compact={true}
          data-testid="PlansToolbar-status-filter"
          onChange={handleStatusChange}
          options={STATUS_OPTIONS}
          value={statuses}
        />
        <div>
          <AssigneeMultiSelect
            onChange={handleAssigneeChange}
            options={assigneeOptions}
            value={assignees}
          />
        </div>
        <SortDropdown
          onChange={handleSortChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />

        <div className="min-w-0 flex-1" />
      </div>
    </div>
  );
};
