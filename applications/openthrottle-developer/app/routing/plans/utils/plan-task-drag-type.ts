/** @description react-dnd drag type for plan task cards on the board. */
export const PLAN_TASK_DRAG_TYPE = 'plan-task-card' as const;

export interface PlanTaskDragItem {
  currentStatus: string;
  planId: string;
  taskId: string;
  type: typeof PLAN_TASK_DRAG_TYPE;
}
