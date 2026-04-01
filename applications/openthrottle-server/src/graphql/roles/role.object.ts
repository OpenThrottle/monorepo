/**
 * @description GraphQL ObjectType for Role. Mirrors {@link RoleData} and includes permissions relation.
 */

import type { RoleData } from '@openthrottle/nestjs-repositories';
import { Field, ObjectType } from '@nestjs/graphql';
import { PermissionObject } from './permission.object';

@ObjectType()
export class RoleObject implements RoleData {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => String, {
    description: `Role identifier (e.g. admin, user, viewer)`,
  })
  name!: string;

  @Field(() => [PermissionObject], {
    description: `Permissions assigned to this role`,
  })
  permissions!: PermissionObject[];

  @Field(() => Date)
  updatedAt!: Date;
}
