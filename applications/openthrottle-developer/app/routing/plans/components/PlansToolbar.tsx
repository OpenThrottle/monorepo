import * as React from 'react';
import clsx from 'clsx';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { FileUpIcon, PlusIcon } from 'lucide-react';
import { STATUS_OPTIONS } from '~/routing/plans/config/status-options';
import { SortDropdown } from '~/routing/plans/components/SortDropdown';
import { AssigneeMultiSelect } from '~/routing/plans/components/AssigneeMultiSelect';
import { StatusMultiSelect } from '~/routing/plans/components/StatusMultiSelect';
import { usePlansToolbar } from '~/routing/plans/hooks/usePlansToolbar';
import { PlansSortBy, PlansSortOrder } from '~/routing/plans/config/types';

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
 * @description Single-row compact toolbar: URL-driven search (q), semantic switch, status toggle group, assignee dropdown, sort dropdown, Create plan. Preserves role=search, data-testid, and URL-driven state.
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
  const {
    handleAssigneeChange,
    handleSearchSubmit,
    handleSortChange,
    handleStatusChange,
    searchInput,
    setSearchInput,
  } = usePlansToolbar({ limit, page });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('w-full', className)} data-testid="PlansToolbar">
      <form onSubmit={handleSearchSubmit} role="search">
        <div className={clsx('flex w-full flex-wrap items-center', 'gap-2')}>
          <Input
            aria-label="Search plans"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-[170px] min-w-[100px] border px-2.5 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
            name="q"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search plans & tasks"
            type="search"
            value={searchInput}
          />
          <Button type="submit" variant="outline">
            Search
          </Button>

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
          <Button asChild={true} className="shrink-0" variant="outline">
            <Link to="/plans/upload-decompose">
              <FileUpIcon className="h-4 w-4" /> Upload document
            </Link>
          </Button>
          <Button asChild={true} className="shrink-0" variant="outline">
            <Link to="/plans/create">
              <PlusIcon className="h-4 w-4" /> Create plan
            </Link>
          </Button>
        </div>

        {/* <div className="mt-4 flex items-center gap-2">
          <Label>Status:</Label>
          <ToggleGroup
            aria-label="Filter by status"
            className="flex flex-wrap gap-1 items-center"
            data-testid="PlansToolbar-status-toggle"
            onValueChange={(value) => handleStatusChange(value ?? [])}
            size="xs"
            type="multiple"
            value={statuses.length > 0 ? [...statuses] : []}
            variant="outline"
          >
            {PLAN_STATUS_FILTER_OPTIONS.map((opt) => (
              <ToggleGroupItem
                aria-label={opt.label}
                data-value={opt.value}
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div> */}
      </form>
    </div>
  );
};
