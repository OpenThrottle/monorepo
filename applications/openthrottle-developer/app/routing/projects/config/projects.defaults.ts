export const PROJECTS_DEFAULT_LIMIT = 10;

/** Plans per page on the project detail route. */
export const PROJECT_PLANS_PAGE_LIMIT = 50;

// const SORT_BY_VALUES = ['name', 'createdAt', 'updatedAt'] as const;
// const SORT_ORDER_VALUES = ['asc', 'desc'] as const;

/** Resource route a plan row loads its tasks from on first expand. */
export const PROJECT_PLAN_TASKS_PATH = '/resources/project-plan-tasks';

/** Tasks an expanded plan row shows before its "Show all" toggle. */
export const PROJECT_PLAN_TASKS_VISIBLE_LIMIT = 10;
