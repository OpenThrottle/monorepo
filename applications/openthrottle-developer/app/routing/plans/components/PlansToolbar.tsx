import * as React from 'react';
import classnames from 'classnames';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { Link, useSearchParams } from 'react-router';
import { FileUpIcon, PlusIcon } from 'lucide-react';
import { STATUS_OPTIONS } from '~/routing/plans/config/status-options';
import { SortDropdown } from '~/routing/plans/components/SortDropdown';
import { AssigneeMultiSelect } from '~/routing/plans/components/AssigneeMultiSelect';
import { StatusMultiSelect } from '~/routing/plans/components/StatusMultiSelect';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = React.useState(
    () => searchParams.get('q') ?? '',
  );
  const [semanticChecked, setSemanticChecked] = React.useState(
    () =>
      searchParams.get('semantic') === '1' ||
      searchParams.get('semantic') === 'true',
  );

  const handleAssigneeChange = React.useCallback(
    (newAssignees: string[]) => {
      const next = new URLSearchParams(searchParams);
      next.delete('assignee');
      for (const a of newAssignees) {
        next.append('assignee', a);
      }
      next.set('page', '1');
      next.set('limit', String(limit));
      setSearchParams(next, { replace: true });
    },
    [limit, searchParams, setSearchParams],
  );

  const handleStatusChange = React.useCallback(
    (newStatuses: string[]) => {
      const next = new URLSearchParams(searchParams);
      next.delete('status');
      for (const s of newStatuses) {
        next.append('status', s);
      }
      next.set('page', '1');
      next.set('limit', String(limit));
      setSearchParams(next, { replace: true });
    },
    [limit, searchParams, setSearchParams],
  );

  const applyParams = React.useCallback(
    (updates: {
      sortBy?: PlansSortBy;
      sortOrder?: PlansSortOrder;
      view?: PlansToolbarProps['view'];
    }) => {
      const next = new URLSearchParams(searchParams);
      if (updates.sortBy !== undefined) next.set('sortBy', updates.sortBy);
      if (updates.sortOrder !== undefined) {
        next.set('sortOrder', updates.sortOrder);
      }
      if (updates.view !== undefined) next.set('view', updates.view);

      next.set('page', String(page));
      next.set('limit', String(limit));

      setSearchParams(next, { replace: true });
    },

    [limit, page, searchParams, setSearchParams],
  );

  const handleSortChange = React.useCallback(
    (newSortBy: PlansSortBy, newSortOrder: PlansSortOrder) => {
      applyParams({ sortBy: newSortBy, sortOrder: newSortOrder });
    },
    [applyParams],
  );

  const handleSearchSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const next = new URLSearchParams(searchParams);
      const q = searchInput.trim();

      if (q) {
        next.set('q', q);
        if (semanticChecked) {
          next.set('semantic', '1');
        } else {
          next.delete('semantic');
        }
      } else {
        next.delete('q');
        next.delete('semantic');
      }

      next.set('page', '1');
      next.set('limit', String(limit));

      setSearchParams(next, { replace: true });
    },

    [limit, searchParams, searchInput, semanticChecked, setSearchParams],
  );

  // Setup
  const searchQuery = searchParams.get('q') ?? '';
  const searchModeSemantic =
    searchParams.get('semantic') === '1' ||
    searchParams.get('semantic') === 'true';

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setSearchInput(searchQuery);
    setSemanticChecked(searchModeSemantic);
  }, [searchQuery, searchModeSemantic]);

  // 🔌 Short Circuit

  return (
    <div className={classnames('w-full', className)} data-testid="PlansToolbar">
      <form onSubmit={handleSearchSubmit} role="search">
        <div
          className={classnames('flex flex-wrap items-center w-full', 'gap-2')}
        >
          <Input
            aria-label="Search plans"
            className="min-w-[100px] w-[170px] border border-input bg-background px-2.5 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <AssigneeMultiSelect
            onChange={handleAssigneeChange}
            options={assigneeOptions}
            value={assignees}
          />
          <SortDropdown
            onChange={handleSortChange}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
          <div className="flex-1 min-w-0" />
          <Button asChild={true} className="shrink-0" variant="outline">
            <Link to="/plans/upload-decompose">
              <FileUpIcon className="w-4 h-4" /> Upload document
            </Link>
          </Button>
          <Button asChild={true} className="shrink-0" variant="outline">
            <Link to="/plans/create">
              <PlusIcon className="w-4 h-4" /> Create plan
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
