/**
 * @description Registers the GraphQL enum `ProjectPlanMoveDirection` for `moveProjectPlan`,
 * from the service's `PROJECT_PLAN_MOVE_DIRECTION` constant.
 */

import { registerEnumType } from '@nestjs/graphql';

import { PROJECT_PLAN_MOVE_DIRECTION } from '../../services/plan-project-membership/plan-project-membership.constants.ts';

registerEnumType(PROJECT_PLAN_MOVE_DIRECTION, {
  description: `Which neighbour a plan swaps with in project order: UP is the earlier plan, DOWN the later one.`,
  name: 'ProjectPlanMoveDirection',
});

export { PROJECT_PLAN_MOVE_DIRECTION };
