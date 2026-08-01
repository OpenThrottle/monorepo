/**
 * @description GraphQL ObjectType for a rollout feature flag. Mirrors {@link RolloutFlagData} from @openthrottle/nestjs-rollout.
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { RolloutFlagData } from '@openthrottle/nestjs-rollout';

@ObjectType()
export class RolloutFlagObject implements RolloutFlagData {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => Boolean, {
    description: `Master switch. When false the flag is off for everyone.`,
  })
  enabled!: boolean;

  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    description: `Unique flag key (e.g. new-dashboard or billing.invoices)`,
  })
  key!: string;

  @Field(() => [String], {
    description: `RBAC role names the flag targets. Empty => enabled for everyone.`,
  })
  targetRoles!: string[];

  @Field(() => Date)
  updatedAt!: Date;
}
