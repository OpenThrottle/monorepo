/**
 * @description GraphQL ObjectTypes for admin rollout feature flags: kind,
 * variations (valueJson), offVariation, and fallthrough percentage allocations.
 */

import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import type { RolloutFlagKind } from '@openthrottle/nestjs-rollout';
import { RolloutFlagKindEnum } from './rollout-flag-kind.enum';

@ObjectType({
  description: `One weighted bucket in a fallthrough allocation (integer percent 0–100).`,
})
export class RolloutFallthroughBucketObject {
  @Field(() => Int, {
    description: `Index into the flag's variations array.`,
  })
  variation!: number;

  @Field(() => Int, {
    description: `Integer percent weight 0–100. All weights on a flag must sum to 100.`,
  })
  weight!: number;
}

@ObjectType({
  description: `Percentage allocation among variations when the flag is on and targeting passes.`,
})
export class RolloutFallthroughObject {
  @Field(() => [RolloutFallthroughBucketObject], {
    description: `Ordered weighted buckets. Weights must sum to 100.`,
  })
  variations!: RolloutFallthroughBucketObject[];
}

@ObjectType({
  description: `One variation on a typed rollout flag. valueJson is JSON-serialized.`,
})
export class RolloutFlagVariationObject {
  @Field(() => String, {
    description: `Optional human description of this variation.`,
    nullable: true,
  })
  description!: string | null;

  @Field(() => String, {
    description: `Optional display name for this variation.`,
    nullable: true,
  })
  name!: string | null;

  @Field(() => String, {
    description: `JSON-serialized variation value (must match the flag kind).`,
  })
  valueJson!: string;
}

@ObjectType({
  description: `Admin view of a typed rollout feature flag (kind, variations, allocations).`,
})
export class RolloutFlagObject {
  @Field(() => Date)
  createdAt!: Date;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => Boolean, {
    description: `Master switch. When false the flag is off for everyone.`,
  })
  enabled!: boolean;

  @Field(() => RolloutFallthroughObject, {
    description: `Fallthrough percentage allocation when enabled and targeting passes.`,
  })
  fallthrough!: RolloutFallthroughObject;

  @Field(() => ID)
  id!: string;

  @Field(() => String, {
    description: `Unique flag key (e.g. new-dashboard or billing.invoices)`,
  })
  key!: string;

  @Field(() => RolloutFlagKindEnum, {
    description: `Flag value kind: boolean | string | number | json.`,
  })
  kind!: RolloutFlagKind;

  @Field(() => Int, {
    description: `Index into variations returned when disabled or role gate fails.`,
  })
  offVariation!: number;

  @Field(() => [String], {
    description: `RBAC role names the flag targets. Empty => enabled for everyone.`,
  })
  targetRoles!: string[];

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => [RolloutFlagVariationObject], {
    description: `Ordered variations. valueJson is JSON-serialized and must match kind.`,
  })
  variations!: RolloutFlagVariationObject[];
}
