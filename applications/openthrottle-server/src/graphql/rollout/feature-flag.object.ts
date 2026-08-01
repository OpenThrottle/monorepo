/**
 * @description GraphQL ObjectType for an actor-evaluated feature flag (key + on/off).
 * Backs the myFeatureFlags query; mirrors {@link EvaluatedFlag} from @openthrottle/nestjs-rollout.
 */

import { Field, ObjectType } from '@nestjs/graphql';
import type { EvaluatedFlag } from '@openthrottle/nestjs-rollout';

@ObjectType()
export class FeatureFlagObject implements EvaluatedFlag {
  @Field(() => Boolean, {
    description: `Whether the flag is on for the current actor.`,
  })
  enabled!: boolean;

  @Field(() => String, { description: `Flag key.` })
  key!: string;
}
