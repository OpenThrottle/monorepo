/**
 * @description GraphQL ObjectType for ServiceAccount.
 */

import type { ServiceAccountData } from '@openthrottle/nestjs-repositories';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ServiceAccountObject implements ServiceAccountData {
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
    description: `Stable identifier (e.g. mcp-developer, workflow-ralph).`,
  })
  name!: string;
}
