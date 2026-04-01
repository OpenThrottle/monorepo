/**
 * @description GraphQL ObjectType for CommitLink. Mirrors the commit_links entity from @openthrottle/nestjs-repositories.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';
import { TaskObject } from '../tasks/task.object';

@ObjectType()
export class CommitLinkObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  message!: string | null;

  @Field(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  plan!: PlanObject | null;

  @Field(() => String)
  planId!: string;

  @Field(() => String)
  repo!: string;

  @Field(() => String)
  sha!: string;

  @Field(() => TaskObject, {
    description: `Resolved task entity when taskId is set`,
    nullable: true,
  })
  task!: TaskObject | null;

  @Field(() => String, { nullable: true })
  taskId!: string | null;
}
