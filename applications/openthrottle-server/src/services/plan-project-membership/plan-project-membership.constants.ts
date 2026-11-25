/**
 * @description Which neighbour `movePlan` swaps with: `UP` is the earlier plan in project
 * order, `DOWN` the later one.
 */
export const PROJECT_PLAN_MOVE_DIRECTION = {
  DOWN: 'DOWN',
  UP: 'UP',
} as const;

export type ProjectPlanMoveDirectionKey =
  keyof typeof PROJECT_PLAN_MOVE_DIRECTION;
export type ProjectPlanMoveDirectionValue =
  (typeof PROJECT_PLAN_MOVE_DIRECTION)[ProjectPlanMoveDirectionKey];
