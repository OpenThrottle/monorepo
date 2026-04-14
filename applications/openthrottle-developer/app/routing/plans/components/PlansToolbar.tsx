import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Input,
  Switch,
  // ToggleGroup,
  // ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { Link, useSearchParams } from 'react-router';
import {
  // PLAN_STATUS_FILTER_OPTIONS,
  STATUS_OPTIONS,
} from '~/routing/plans/config/status-options';
import { SortDropdown } from '~/routing/plans/components/SortDropdown';
import { AssigneeMultiSelect } from '~/routing/plans/components/AssigneeMultiSelect';
import { StatusMultiSelect } from '~/routing/plans/components/StatusMultiSelect';
import { PlansSortBy, PlansSortOrder } from '~/routing/plans/config/types';

export type ViewMode = 'table' | 'card';

export interface PlansToolbarProps {
  readonly assigneeOptions: readonly string[];
  readonly assignees: readonly string[];
  className?: string;
  limit: number;
  page: number;
  sortBy: PlansSortBy;
  sortOrder: PlansSortOrder;
  statuses: readonly string[];
  view: ViewMode;
}

/**
 * @description Single-row compact toolbar: URL-driven search (q), semantic switch, status toggle group, assignee dropdown, sort dropdown, Create plan. Preserves role=search, data-testid, and URL-driven state.
 */
export const PlansToolbar = (props: PlansToolbarProps) => {
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
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') ?? '';
  const searchModeSemantic =
    searchParams.get('semantic') === '1' ||
    searchParams.get('semantic') === 'true';

  const [searchInput, setSearchInput] = React.useState(() => searchQuery);
  const [semanticChecked, setSemanticChecked] = React.useState(
    () => searchModeSemantic,
  );

  const _baseSearchParams = React.useMemo(() => {
    const p = new URLSearchParams(searchParams);
    p.set('page', String(page));
    p.set('limit', String(limit));
    p.set('sortBy', sortBy);
    p.set('sortOrder', sortOrder);
    p.delete('assignee');
    for (const a of assignees) {
      p.append('assignee', a);
    }
    p.delete('status');
    for (const s of statuses) {
      p.append('status', s);
    }
    return p;
  }, [assignees, limit, page, searchParams, sortBy, sortOrder, statuses]);

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
      view?: ViewMode;
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

  React.useEffect(() => {
    setSearchInput(searchQuery);
    setSemanticChecked(searchModeSemantic);
  }, [searchQuery, searchModeSemantic]);

  return (
    <div className={classnames('w-full', className)} data-testid="PlansToolbar">
      <form
        className="flex flex-wrap items-center gap-2 w-full"
        onSubmit={handleSearchSubmit}
        role="search"
      >
        <Input
          aria-label="Search plans"
          className="min-w-[100px] w-[140px] shrink-0 rounded-md border border-input bg-background px-2.5 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          name="q"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="By title or meaning…"
          type="search"
          value={searchInput}
        />
        <Switch
          aria-label="Semantic search"
          checked={semanticChecked}
          id="plans-toolbar-semantic"
          onCheckedChange={setSemanticChecked}
          title="Semantic search"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
        {/* Alternative to ToggleGroup: compact StatusMultiSelect popover; we may revert to the ToggleGroup below.
        <ToggleGroup
          aria-label="Filter by status"
          className="flex flex-wrap gap-1"
          data-testid="PlansToolbar-status-toggle"
          onValueChange={(value) => handleStatusChange(value ?? [])}
          size="sm"
          type="multiple"
          value={statuses.length > 0 ? [...statuses] : []}
          variant="outline"
        >
          {PLAN_STATUS_FILTER_OPTIONS.map((opt) => (
            <ToggleGroupItem
              aria-label={opt.label}
              key={opt.value}
              value={opt.value}
            >
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        */}
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
        <Button asChild={true} className="shrink-0" variant="default">
          <Link to="/plans/new/create">Create plan</Link>
        </Button>
      </form>
    </div>
  );
};
