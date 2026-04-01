/**
 * @description GraphQL input types for role and permission mutations.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateRoleInput {
  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, {
    description: `Role name (e.g. admin, user, viewer). Must be unique.`,
  })
  name!: string;
}

@InputType()
export class UpdateRoleInput {
  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID, { description: `Role id to update` })
  id!: string;

  @Field(() => String, {
    description: `Role name. Pass null to leave unchanged.`,
    nullable: true,
  })
  name!: string | null;
}

@InputType()
export class AssignRoleToUserInput {
  @Field(() => ID, { description: `Role id to assign` })
  roleId!: string;

  @Field(() => ID, { description: `User id to assign the role to` })
  userId!: string;
}

@InputType()
export class RemoveRoleFromUserInput {
  @Field(() => ID, { description: `Role id to remove` })
  roleId!: string;

  @Field(() => ID, { description: `User id to remove the role from` })
  userId!: string;
}

@InputType()
export class AddPermissionToRoleInput {
  @Field(() => ID, { description: `Permission id to add` })
  permissionId!: string;

  @Field(() => ID, { description: `Role id to add the permission to` })
  roleId!: string;
}

@InputType()
export class RemovePermissionFromRoleInput {
  @Field(() => ID, { description: `Permission id to remove` })
  permissionId!: string;

  @Field(() => ID, { description: `Role id to remove the permission from` })
  roleId!: string;
}
