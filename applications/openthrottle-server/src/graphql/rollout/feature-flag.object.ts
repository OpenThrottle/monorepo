/**
 * @description GraphQL ObjectType for an actor-evaluated feature flag (key + on/off).
 * Backs the myFeatureFlags query. Typed evaluation lives on RolloutService.evaluate /
 * evaluateAll; this object stays boolean-shaped until the GraphQL rollout task evolves it.
 */

import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class FeatureFlagObject {
  @Field(() => Boolean, {
    description: `Whether the flag is on for the current actor.`,
  })
  enabled!: boolean;

  @Field(() => String, { description: `Flag key.` })
  key!: string;
}
