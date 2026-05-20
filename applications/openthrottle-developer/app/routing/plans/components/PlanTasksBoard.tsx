import * as React from 'react';
import classnames from 'classnames';
// import { DndProvider } from 'react-dnd';
// import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrag, useDrop } from 'react-dnd';
import { useFetcher, useRevalidator } from 'react-router';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanTaskCard } from '~/routing/plans/components/PlanTaskCard';
import { isPlanStatusKey } from '~/routing/plans/components/PlanStatusBadge';
import { PlanTasksColumn } from '~/routing/plans/components/PlanTasksColumn';
import {
  getPlanTaskBoardColumnId,
  getPlanTaskBoardColumnTitle,
  groupPlanTasksByStatus,
  PLAN_TASK_BOARD_COLUMN_ORDER,
  type PlanTaskBoardGroupKey,
} from '~/routing/plans/utils/group-plan-tasks-by-status';

/** @description react-dnd drag type for plan task cards on the board. */
const PLAN_TASK_DRAG_TYPE = 'plan-task-card' as const;

interface PlanTaskDragItem {
  currentStatus: string;
  planId: string;
  taskId: string;
  type: typeof PLAN_TASK_DRAG_TYPE;
}

export interface PlanTasksBoardProps {
  className?: string;
  planId: string;
  tasks: PlanTaskRowFragment[];
}

type PlanDetailActionData =
  | { ok: true }
  | { updateTaskError: string }
  | undefined;

interface DraggablePlanTaskCardProps {
  planId: string;
  task: PlanTaskRowFragment;
}

/**
 * @description Draggable wrapper; whole card is a drag handle (links remain clickable without starting a drag).
 */
const DraggablePlanTaskCard = (props: DraggablePlanTaskCardProps) => {
  const { planId, task } = props;

  // Hooks
  const [{ isDragging }, drag] = useDrag({
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    item: (): PlanTaskDragItem => ({
      currentStatus: task.status ?? '',
      planId,
      taskId: task.id,
      type: PLAN_TASK_DRAG_TYPE,
    }),
    type: PLAN_TASK_DRAG_TYPE,
  });

  // Setup
  // react-dnd ConnectDragSource is not assignable to React.Ref (upstream typing gap).
  const dragRef = drag as unknown as React.Ref<HTMLDivElement>;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(
        'touch-manipulation rounded-md',
        isDragging && 'opacity-50',
      )}
      ref={dragRef}
    >
      <PlanTaskCard task={task} />
    </div>
  );
};

interface PlanTasksColumnDropProps {
  acceptsDrop: boolean;
  children: React.ReactNode;
  columnId: string;
  columnKey: PlanTaskBoardGroupKey;
  emptyLabel?: string;
  onDropTask: (taskId: string, newStatus: string) => void;
  title: string;
}

/**
 * @description Drop target for a status column; highlights when a task can be dropped here.
 */
const PlanTasksColumnDrop = (props: PlanTasksColumnDropProps) => {
  const {
    acceptsDrop,
    children,
    columnId,
    columnKey,
    emptyLabel,
    onDropTask,
    title,
  } = props;

  // Hooks
  const [{ isOver, canDrop }, drop] = useDrop<
    PlanTaskDragItem,
    void,
    { canDrop: boolean; isOver: boolean }
  >({
    accept: PLAN_TASK_DRAG_TYPE,
    canDrop: () => acceptsDrop,
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      isOver: monitor.isOver({ shallow: true }),
    }),
    drop: (item) => {
      if (!acceptsDrop || columnKey === 'UNKNOWN') return;
      const targetStatus = columnKey;
      if (item.currentStatus === targetStatus) return;
      onDropTask(item.taskId, targetStatus);
    },
  });

  // Setup
  const highlight =
    acceptsDrop && canDrop && isOver ? 'ring-2 ring-primary ring-offset-2' : '';

  let dropRef: React.Ref<HTMLElement> | undefined;
  if (acceptsDrop) {
    dropRef = drop as unknown as React.Ref<HTMLElement>;
  }

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <PlanTasksColumn
      className={highlight}
      columnId={columnId}
      droppableRef={dropRef}
      emptyLabel={emptyLabel}
      title={title}
    >
      {children}
    </PlanTasksColumn>
  );
};

/**
 * @description Inner board: grouping, optimistic status updates, and react-dnd (must sit under {@link DndProvider}).
 */
export const PlanTasksBoard = (props: PlanTasksBoardProps) => {
  const { className, planId, tasks } = props;

  // Hooks
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
        className={classnames(
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
