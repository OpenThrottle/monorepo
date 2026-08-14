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

@InputType({
  description: `Edit an owned repository's name, default branch, and/or project link. Omitted fields are left unchanged.`,
})
export class UpdateRepositoryInput {
  @Field(() => String, {
    description: `New default branch; omit to leave unchanged.`,
    nullable: true,
  })
  defaultBranch?: string | null;

  @Field(() => Boolean, {
    description: `Opt this user's checkouts of the repository into (or out of) foreign-workspace skill injection; omit to leave unchanged.`,
    nullable: true,
  })
  foreignSkillInjectionEnabled?: boolean | null;

  @Field(() => ID, {
    description: `Repository id.`,
  })
  id!: string;

  @Field(() => String, {
    description: `New display name; omit to leave unchanged.`,
    nullable: true,
  })
  name?: string | null;

  @Field(() => ID, {
    description: `OpenThrottle project to link, or null to clear; omit to leave unchanged.`,
    nullable: true,
  })
  projectId?: string | null;
}
