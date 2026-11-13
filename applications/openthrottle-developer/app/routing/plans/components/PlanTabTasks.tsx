import { cn, DataTable, TabsContent } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanTasksEmpty } from '~/routing/plans/components/PlanTasksEmpty';
import {
  MOBILE_CARD_ROW_CLASS,
  MOBILE_CARD_TABLE_CLASS,
} from '~/routing/plans/data/data.mobile-card';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { usePlanManagedTaskIds } from '~/routing/plans/hooks/usePlanManagedTaskIds';
import { buildPlanTabTasksColumns } from '~/routing/plans/utils/buildPlanTabTasksColumns';
import { filterOutHookTasks } from '~/routing/plans/utils/hook-tasks';
import { sortPlanTasksByListOrder } from '~/routing/plans/utils/sortPlanTasksByListOrder';

export interface PlanTabTasksProps {
  /** In-flight tasks with a waiting STEER message (see usePlanInbox). */
  readonly steerPendingTaskIds: ReadonlySet<string>;
}

export const PlanTabTasks = (props: PlanTabTasksProps): React.ReactElement => {
  const { steerPendingTaskIds } = props;

  // Hooks
  const { tasks } = usePlanDetailRouteData();
  const managedTaskIds = usePlanManagedTaskIds();
  const sortedTasks = React.useMemo(
    () => sortPlanTasksByListOrder(filterOutHookTasks(tasks)),
    [tasks],
  );
  const columns = React.useMemo(
    () => buildPlanTabTasksColumns(managedTaskIds, steerPendingTaskIds),
    [managedTaskIds, steerPendingTaskIds],
  );

  // Setup
  const getRowId = React.useCallback(
    (task: PlanTaskRowFragment) => task.id,
    [],
  );

  const getRowProps = React.useCallback(
    (row: { original: PlanTaskRowFragment }) => ({
      className: MOBILE_CARD_ROW_CLASS,
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
      <div className="border-card-border rounded-lg border">
        <DataTable<PlanTaskRowFragment, string | null | undefined>
          className={cn('table-auto', MOBILE_CARD_TABLE_CLASS)}
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
