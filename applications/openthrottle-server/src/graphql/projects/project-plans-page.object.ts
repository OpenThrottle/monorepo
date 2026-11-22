/**
 * @description Result of `projectPlansPage`: one page of a project's live plans in project
 * order, plus the project's total live plan count so a client can render page controls.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { OffsetPageObject } from '@openthrottle/nestjs-graphql';

import { PlanObject } from '../plans/plan.object.ts';

@ObjectType()
export class ProjectPlansPageResultObject extends OffsetPageObject {
  @Field(() => [PlanObject], {
    description: `This page's plans, in project order`,
  })
  items!: PlanObject[];
}
