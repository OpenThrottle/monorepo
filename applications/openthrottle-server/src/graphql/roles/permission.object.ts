/**
 * @description GraphQL ObjectType for Permission. Mirrors {@link PermissionData} from @openthrottle/nestjs-repositories.
 */

import type { PermissionData } from '@openthrottle/nestjs-repositories';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PermissionObject implements PermissionData {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => String)
  id!: string;

  @Field(() => String, {
    description: `Permission identifier (e.g. users:read, settings:write)`,
  })
  name!: string;
}
