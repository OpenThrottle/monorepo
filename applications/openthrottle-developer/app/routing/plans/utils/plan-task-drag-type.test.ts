import { describe, expect, test } from 'vitest';
import { PLAN_TASK_DRAG_TYPE } from './plan-task-drag-type';
import type { PlanTaskDragItem } from './plan-task-drag-type';

describe('PLAN_TASK_DRAG_TYPE', () => {
  test('is the stable react-dnd drag type string', () => {
    expect(PLAN_TASK_DRAG_TYPE).toBe('plan-task-card');
  });
});

describe('PlanTaskDragItem', () => {
  test('accepts a drag item shaped with the drag type constant', () => {
    const item: PlanTaskDragItem = {
      currentStatus: 'IN_PROGRESS',
      planId: 'plan-1',
      taskId: 'task-1',
      type: PLAN_TASK_DRAG_TYPE,
    };

    expect(item.type).toBe(PLAN_TASK_DRAG_TYPE);
    expect(item.planId).toBe('plan-1');
    expect(item.taskId).toBe('task-1');
    expect(item.currentStatus).toBe('IN_PROGRESS');
  });
});
