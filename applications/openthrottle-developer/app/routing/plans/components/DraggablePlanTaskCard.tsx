import * as React from 'react';
import clsx from 'clsx';
import { useDrag } from 'react-dnd';
import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import { PlanTaskCard } from '~/routing/plans/components/PlanTaskCard';
import { PLAN_TASK_DRAG_TYPE } from '~/routing/plans/utils/plan-task-drag-type';
import type { PlanTaskDragItem } from '~/routing/plans/utils/plan-task-drag-type';

export interface DraggablePlanTaskCardProps {
  /** True when a tag→action rule manages this task's placement. */
  isManaged?: boolean;
  planId: string;
  task: PlanTaskRowFragment;
}

/**
 * @description Draggable wrapper; whole card is a drag handle (links remain clickable without starting a drag).
 */
export const DraggablePlanTaskCard = (
  props: DraggablePlanTaskCardProps,
): React.ReactElement => {
  const { isManaged = false, planId, task } = props;

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
  // react-dnd's ConnectDragSource is itself a ref-callback style connector, so
  // wrap it in a real RefCallback rather than casting past the typing gap.
  const dragRef: React.RefCallback<HTMLDivElement> = (node) => {
    drag(node);
  };

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'touch-manipulation rounded-md',
        isDragging && 'opacity-50',
      )}
      ref={dragRef}
    >
      <PlanTaskCard isManaged={isManaged} task={task} />
    </div>
  );
};
