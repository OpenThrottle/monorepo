import * as React from 'react';
import { DataTable, TabsContent } from '@openthrottle/react-router-shadcn';
import { PlanTaskRowFragment } from '~/__generated__/graphql';
import { filterOutHookTasks } from '~/routing/plans/utils/hook-tasks';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { usePlanManagedTaskIds } from '~/routing/plans/hooks/usePlanManagedTaskIds';
import { PlanTasksEmpty } from '~/routing/plans/components/PlanTasksEmpty';
import { buildPlanTabTasksColumns } from '~/routing/plans/utils/plan-tab-tasks-columns';
import { sortPlanTasksByListOrder } from '~/routing/plans/utils/sort-plan-tasks-by-list-order';

export interface PlanTabTasksProps {
  // className?: string;
}

export const PlanTabTasks = (_props: PlanTabTasksProps): React.ReactElement => {
  // Hooks
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

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent value="tasks">
      <div className="bg-card border-card-border rounded-lg border">
        <DataTable<PlanTaskRowFragment, string | null | undefined>
          className="table-auto"
          columns={columns}
          data={sortedTasks}
          emptyState={<PlanTasksEmpty variant="tasks" />}
          getRowId={getRowId}
          getRowProps={getRowProps}
        />
      </div>
    </TabsContent>
  );
};
