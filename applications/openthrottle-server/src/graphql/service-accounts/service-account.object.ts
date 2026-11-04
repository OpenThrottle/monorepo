/**
 * @description GraphQL ObjectType for ServiceAccount.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import type { ServiceAccountData } from '@openthrottle/nestjs-repositories';

@ObjectType()
export class ServiceAccountObject implements ServiceAccountData {
  @Field(() => String, {
    description: `The human user this machine identity acts as for user-scoped conveniences (e.g. plan workspace seeding). A hint, never a permission grant.`,
    nullable: true,
  })
  actingUserId!: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => Date, {
    description: `When set, the service account cannot authenticate.`,
    nullable: true,
  })
  disabledAt!: Date | null;

  @Field(() => String)
  id!: string;

  @Field(() => String, {
    description: `Stable identifier (e.g. openthrottle-mcp, workflow-ralph).`,
  })
  name!: string;
}
