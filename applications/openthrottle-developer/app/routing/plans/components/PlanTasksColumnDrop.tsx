import * as React from 'react';
import { useDrop } from 'react-dnd';
import { PlanTasksColumn } from '~/routing/plans/components/PlanTasksColumn';
import { PLAN_TASK_DRAG_TYPE } from '~/routing/plans/utils/plan-task-drag-type';
import type { PlanTaskDragItem } from '~/routing/plans/utils/plan-task-drag-type';
import type { PlanTaskBoardGroupKey } from '~/routing/plans/utils/group-plan-tasks-by-status';

export interface PlanTasksColumnDropProps {
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
export const PlanTasksColumnDrop = (
  props: PlanTasksColumnDropProps,
): React.ReactElement => {
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

  let dropRef: React.RefCallback<HTMLElement> | undefined;
  if (acceptsDrop) {
    dropRef = (node) => {
      drop(node);
    };
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
