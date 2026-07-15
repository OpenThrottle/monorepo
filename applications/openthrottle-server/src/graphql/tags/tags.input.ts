/**
 * @description GraphQL inputs for plan/task tag mutations. Deliberately no
 * `source` field anywhere: provenance is derived from the caller identity
 * server-side and can never be client-supplied.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class AddPlanTagInput {
  @Field(() => ID, { description: `Plan to tag.` })
  planId!: string;

  @Field(() => String, {
    description: `Kebab-case tag slug from the caller's skill-tag vocabulary.`,
  })
  tag!: string;
}

@InputType()
export class RemovePlanTagInput {
  @Field(() => ID, { description: `Plan to remove the tag from.` })
  planId!: string;

  @Field(() => String, { description: `Tag slug to remove.` })
  tag!: string;
}

@InputType()
export class AddProjectTagInput {
  @Field(() => ID, { description: `Project to tag.` })
  projectId!: string;

  @Field(() => String, {
    description: `Kebab-case tag slug from the caller's skill-tag vocabulary.`,
  })
  tag!: string;
}

@InputType()
export class RemoveProjectTagInput {
  @Field(() => ID, { description: `Project to remove the tag from.` })
  projectId!: string;

  @Field(() => String, { description: `Tag slug to remove.` })
  tag!: string;
}

@InputType()
export class AddTaskTagInput {
  @Field(() => ID, { description: `Task to tag.` })
  taskId!: string;

  @Field(() => String, {
    description: `Kebab-case tag slug from the caller's skill-tag vocabulary.`,
  })
  tag!: string;
}

@InputType()
export class RemoveTaskTagInput {
  @Field(() => ID, { description: `Task to remove the tag from.` })
  taskId!: string;

  @Field(() => String, { description: `Tag slug to remove.` })
  tag!: string;
}
