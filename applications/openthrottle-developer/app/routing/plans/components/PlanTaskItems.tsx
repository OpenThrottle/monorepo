import * as React from 'react';
import clsx from 'clsx';
import { PlanTaskItem } from '~/routing/plans/components/PlanTaskItem';
import { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanTasksEmpty } from '~/routing/plans/components/PlanTasksEmpty';
import {
  getPlanTaskStepIndex,
  sortPlanTasksByListOrder,
} from '~/routing/plans/utils/sort-plan-tasks-by-list-order';

export interface PlanTaskItemsProps {
  className?: string;
  /** Task ids a tag→action rule manages; those rows render a managed badge. */
  managedTaskIds?: ReadonlySet<string>;
  tasks: PlanTaskRowFragment[];
}

/**
 * @description List-style rendering of plan tasks — the compact alternative to
 * the {@link PlanTabTasks} table. Sorts by list order and renders one
 * {@link PlanTaskItem} per task, falling back to {@link PlanTasksEmpty}.
 */
export const PlanTaskItems = (
  props: PlanTaskItemsProps,
): React.ReactElement => {
  const { className, managedTaskIds, tasks } = props;

  // Hooks
  const sortedTasks = React.useMemo(
    () => sortPlanTasksByListOrder(tasks),
    [tasks],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (sortedTasks.length === 0) {
    return <PlanTasksEmpty />;
  }

  return (
    <div
      className={clsx('flex flex-col gap-4', className)}
      data-testid="PlanTaskItems"
    >
      {sortedTasks.map((task, index) => (
        <PlanTaskItem
          className="bg-card border-card-border divide-card-border rounded-lg border p-4 md:p-8"
          isManaged={managedTaskIds?.has(task.id) ?? false}
          key={task.id}
          step={getPlanTaskStepIndex(index)}
          task={task}
        />
      ))}
    </div>
  );
};
