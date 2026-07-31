/**
 * @description View-mode constant and guard for the {@link PlanTabTasks}
 * list/table toggle. Hoisted from the component file per
 * component-primitive-shape R4 (module-scope helpers/data live in sibling
 * folders).
 */
export const PLAN_TASKS_VIEW = {
  list: 'list',
  table: 'table',
} as const;

export type PlanTasksView =
  (typeof PLAN_TASKS_VIEW)[keyof typeof PLAN_TASKS_VIEW];

export const isPlanTasksView = (value: unknown): value is PlanTasksView =>
  value === PLAN_TASKS_VIEW.list || value === PLAN_TASKS_VIEW.table;
