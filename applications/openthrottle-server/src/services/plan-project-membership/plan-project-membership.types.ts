import type { PROJECT_PLAN_MOVE_DIRECTION } from './plan-project-membership.constants.ts';

export type ProjectPlanMoveDirection =
  (typeof PROJECT_PLAN_MOVE_DIRECTION)[keyof typeof PROJECT_PLAN_MOVE_DIRECTION];
