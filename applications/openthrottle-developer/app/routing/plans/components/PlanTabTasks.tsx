import * as React from 'react';
import {
  DataTable,
  TabsContent,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { List, Table2 } from 'lucide-react';
import { usePersistentSetting } from '~/global/hooks/usePersistentSetting';
import { PlanTaskItems } from '~/routing/plans/components/PlanTaskItems';
import { PlanTaskRowFragment } from '~/__generated__/graphql';
import { filterOutHookTasks } from '~/routing/plans/utils/hook-tasks';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { usePlanManagedTaskIds } from '~/routing/plans/hooks/usePlanManagedTaskIds';
import { PlanTasksEmpty } from '~/routing/plans/components/PlanTasksEmpty';
import { buildPlanTabTasksColumns } from '~/routing/plans/utils/plan-tab-tasks-columns';
import {
  isPlanTasksView,
  PLAN_TASKS_VIEW,
} from '~/routing/plans/utils/plan-tab-tasks-view';
import { sortPlanTasksByListOrder } from '~/routing/plans/utils/sort-plan-tasks-by-list-order';
import type { PlanTasksView } from '~/routing/plans/utils/plan-tab-tasks-view';

export interface PlanTabTasksProps {
  // className?: string;
}

export const PlanTabTasks = (_props: PlanTabTasksProps): React.ReactElement => {
  // Hooks
  const [view, setView] = usePersistentSetting<PlanTasksView>(
    'plans.tasksView',
    PLAN_TASKS_VIEW.table,
    isPlanTasksView,
  );

  const { tasks } = usePlanDetailRouteData();
  const managedTaskIds = usePlanManagedTaskIds();
  const sortedTasks = React.useMemo(
    () => sortPlanTasksByListOrder(filterOutHookTasks(tasks)),
    [tasks],
  );
  const columns = React.useMemo(
    () => buildPlanTabTasksColumns(managedTaskIds),
    [managedTaskIds],
  );

  // Setup
  const getRowId = React.useCallback(
    (task: PlanTaskRowFragment) => task.id,
    [],
  );

  const getRowProps = React.useCallback(
    (row: { original: PlanTaskRowFragment }) => ({
      id: `task-${row.original.id}`,
    }),
    [],
  );

  // Handlers
  const handleViewChange = React.useCallback(
    (value: string) => {
      // Radix emits '' when the active item is re-clicked; keep one view selected.
      if (value === PLAN_TASKS_VIEW.list || value === PLAN_TASKS_VIEW.table) {
        setView(value);
      }
    },
    [setView],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent value="tasks">
      <div className="flex justify-end pb-2">
        <ToggleGroup
          aria-label="Task view"
          data-testid="PlanTabTasks-view-toggle"
          onValueChange={handleViewChange}
          size="xs"
          type="single"
          value={view}
          variant="outline"
        >
          <ToggleGroupItem aria-label="List view" value={PLAN_TASKS_VIEW.list}>
            <List className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Table view"
            value={PLAN_TASKS_VIEW.table}
          >
            <Table2 className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === PLAN_TASKS_VIEW.list ? (
        <PlanTaskItems managedTaskIds={managedTaskIds} tasks={sortedTasks} />
      ) : (
        <div className="bg-card border-card-border rounded-lg border">
          <DataTable<PlanTaskRowFragment, string | null | undefined>
            columns={columns}
            data={sortedTasks}
            emptyState={<PlanTasksEmpty variant="tasks" />}
            getRowId={getRowId}
            getRowProps={getRowProps}
          />
        </div>
      )}
    </TabsContent>
  );
};
