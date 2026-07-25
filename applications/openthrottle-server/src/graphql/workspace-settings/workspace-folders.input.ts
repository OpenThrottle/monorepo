/**
 * @description GraphQL inputs for the add-folder onboarding gesture.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType({
  description: `Register a server-host folder as a workspace checkout.`,
})
export class AddWorkspaceFolderInput {
  @Field(() => String, {
    description: `Optional display name; defaults to the folder name.`,
    nullable: true,
  })
  displayName?: string | null;

  @Field(() => String, {
    description: `Absolute path on the server host.`,
  })
  path!: string;
}

@InputType({
  description: `Re-run inspection on an owned checkout.`,
})
export class RefreshCheckoutInput {
  @Field(() => ID)
  id!: string;
}
