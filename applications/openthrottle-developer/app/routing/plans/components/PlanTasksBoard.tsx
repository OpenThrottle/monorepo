import * as React from 'react';
import clsx from 'clsx';
// import { DndProvider } from 'react-dnd';
// import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from '@openthrottle/react-router-shadcn';
import { useFetcher, useRevalidator } from 'react-router';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { DraggablePlanTaskCard } from '~/routing/plans/components/DraggablePlanTaskCard';
import { usePlanDetailRouteData } from '~/routing/plans/hooks/usePlanDetailRouteData';
import { isPlanStatusKey } from '~/routing/plans/components/PlanStatusBadge';
import { PlanTasksColumnDrop } from '~/routing/plans/components/PlanTasksColumnDrop';
import {
  getPlanTaskBoardColumnId,
  getPlanTaskBoardColumnTitle,
  groupPlanTasksByStatus,
  PLAN_TASK_BOARD_COLUMN_ORDER,
  type PlanTaskBoardGroupKey,
} from '~/routing/plans/utils/group-plan-tasks-by-status';

export interface PlanTasksBoardProps {
  className?: string;
}

type PlanDetailActionData =
  | { ok: true }
  | { updateTaskError: string }
  | undefined;

/**
 * @description Inner board: grouping, optimistic status updates, and react-dnd (must sit under {@link DndProvider}).
 */
export const PlanTasksBoard = (
  props: PlanTasksBoardProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks
  const { plan, tasks } = usePlanDetailRouteData();
  const planId = plan?.id ?? '';
  const fetcher = useFetcher<PlanDetailActionData>();
  const revalidator = useRevalidator();

  const [displayTasks, setDisplayTasks] =
    React.useState<PlanTaskRowFragment[]>(tasks);
  const [announcement, setAnnouncement] = React.useState('');

  const tasksRef = React.useRef(tasks);
  tasksRef.current = tasks;

  React.useEffect(() => {
    setDisplayTasks(tasks);
  }, [tasks]);

  React.useEffect(() => {
    if (fetcher.state !== 'idle' || fetcher.data == null) return;
    if ('updateTaskError' in fetcher.data && fetcher.data.updateTaskError) {
      setDisplayTasks(tasksRef.current);
      setAnnouncement(
        `Failed to move task: ${fetcher.data.updateTaskError}. Reverted.`,
      );
      toast.error(`Failed to move task: ${fetcher.data.updateTaskError}`, {
        id: 'update-task-status',
      });
      return;
    }
    if ('ok' in fetcher.data && fetcher.data.ok) {
      setAnnouncement('Task status updated.');
      revalidator.revalidate();
    }
  }, [fetcher.data, fetcher.state, revalidator]);

  const grouped = React.useMemo(
    () => groupPlanTasksByStatus(displayTasks),
    [displayTasks],
  );

  const handleDropTask = React.useCallback(
    (taskId: string, newStatus: string): void => {
      const previous = tasksRef.current;
      const moved = previous.find((t) => t.id === taskId);
      const columnTitle = getPlanTaskBoardColumnTitle(
        isPlanStatusKey(newStatus) ? newStatus : 'UNKNOWN',
      );

      setDisplayTasks(
        previous.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t,
        ),
      );

      const formData = new FormData();
      formData.set('intent', 'updateTaskStatus');
      formData.set('planId', planId);
      formData.set('taskId', taskId);
      formData.set('status', newStatus);

      fetcher.submit(formData, { method: 'post' });

      if (moved) {
        setAnnouncement(
          `Moving task "${moved.title ?? 'Untitled'}" to ${columnTitle}.`,
        );
      }
    },
    [planId, fetcher.submit],
  );

  // Setup
  const unknownTasks = grouped.get('UNKNOWN') ?? [];
  const columnKeys: PlanTaskBoardGroupKey[] =
    unknownTasks.length > 0
      ? [...PLAN_TASK_BOARD_COLUMN_ORDER, 'UNKNOWN']
      : [...PLAN_TASK_BOARD_COLUMN_ORDER];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div
        aria-live="polite"
        className="sr-only"
        data-testid="PlanTasksBoard-a11y-announcement"
        role="status"
      >
        {announcement}
      </div>
      <div
        aria-busy={fetcher.state !== 'idle'}
        aria-label="Plan tasks board"
        className={clsx(
          'flex min-h-[min(70vh,560px)] w-full min-w-0 gap-3 overflow-x-auto pb-2',
          className,
        )}
        data-testid="PlanTasksBoard"
        role="group"
      >
        {columnKeys.map((key) => {
          const columnTasks = grouped.get(key) ?? [];
          const columnId = getPlanTaskBoardColumnId(key);
          const title = getPlanTaskBoardColumnTitle(key);
          const acceptsDrop = key !== 'UNKNOWN';

          return (
            <PlanTasksColumnDrop
              acceptsDrop={acceptsDrop}
              columnId={columnId}
              columnKey={key}
              key={key}
              onDropTask={handleDropTask}
              title={title}
            >
              {columnTasks.map((task) => (
                <DraggablePlanTaskCard
                  key={task.id}
                  planId={planId}
                  task={task}
                />
              ))}
            </PlanTasksColumnDrop>
          );
        })}
      </div>
    </>
  );
};
