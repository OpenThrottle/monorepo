/**
 * @description GraphQL ObjectType for the result of `setProjectFavorite`: the per-user star state of a
 * project after the toggle.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: `Result of setProjectFavorite: the current user's star state for one project after the toggle.`,
})
export class SetProjectFavoriteResult {
  @Field(() => Boolean, {
    description: `The star state after the toggle: true = starred, false = not starred.`,
  })
  favorite!: boolean;

  @Field(() => ID, {
    description: `The project whose star state was toggled.`,
  })
  projectId!: string;
}
