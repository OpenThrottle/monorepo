/**
 * @description GraphQL input types for service account admin mutations.
 */

import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class CreateServiceAccountInput {
  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String, {
    description: `Stable name (e.g. mcp-developer). Must be unique.`,
  })
  name!: string;
}

@InputType()
export class UpdateServiceAccountInput {
  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    description: `Display name. Pass null to leave unchanged.`,
    nullable: true,
  })
  name!: string | null;
}

@InputType()
export class CreateServiceAccountCredentialInput {
  @Field(() => Date, { nullable: true })
  expiresAt!: Date | null;

  @Field(() => ID)
  serviceAccountId!: string;

  @Field(() => String, { nullable: true })
  label!: string | null;
}

@InputType()
export class AssignRoleToServiceAccountInput {
  @Field(() => ID)
  roleId!: string;

  @Field(() => ID)
  serviceAccountId!: string;
}

@InputType()
export class RemoveRoleFromServiceAccountInput {
  @Field(() => ID)
  roleId!: string;

  @Field(() => ID)
  serviceAccountId!: string;
}
