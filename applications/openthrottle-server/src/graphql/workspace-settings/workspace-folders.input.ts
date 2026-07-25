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
  description: `Clone a git repository into the managed checkout root and register it.`,
})
export class CloneRepositoryInput {
  @Field(() => String, {
    description: `Git clone URL (https or ssh). Cloned with ambient host credentials (SSH agent / gh); OT stores no secrets.`,
  })
  gitUrl!: string;

  @Field(() => String, {
    description: `Optional folder/display name; defaults to the repository name derived from the URL.`,
    nullable: true,
  })
  name?: string | null;
}

@InputType({
  description: `Re-run inspection on an owned checkout.`,
})
export class RefreshCheckoutInput {
  @Field(() => ID)
  id!: string;
}
