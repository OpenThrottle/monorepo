/**
 * @description Result of `projectPlansPage`: one page of a project's live plans in project
 * order, plus the project's total live plan count so a client can render page controls.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PlanObject } from '../plans/plan.object.ts';

@ObjectType()
export class ProjectPlansPageResultObject {
  @Field(() => [PlanObject])
  plans!: PlanObject[];

  @Field(() => Int, {
    description: `Live plans in the project, across every page`,
  })
  totalCount!: number;
}
