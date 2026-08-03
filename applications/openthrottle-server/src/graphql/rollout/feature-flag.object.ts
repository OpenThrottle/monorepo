/**
 * @description Actor-evaluated feature flag for evaluateFeatureFlags (and the
 * deprecated myFeatureFlags). Discriminated by kind with valueJson
 * (JSON-serialized resolved value). `enabled` stays for boolean convenience and
 * non-boolean fallthrough eligibility.
 */

import { Field, Int, ObjectType } from '@nestjs/graphql';
import type {
  RolloutEvaluationReason,
  RolloutFlagKind,
} from '@openthrottle/nestjs-rollout';
import { RolloutEvaluationReasonEnum } from './rollout-evaluation-reason.enum';
import { RolloutFlagKindEnum } from './rollout-flag-kind.enum';

@ObjectType({
  description: `Evaluated rollout flag for the current actor (kind + valueJson discriminator).`,
})
export class FeatureFlagObject {
  @Field(() => Boolean, {
    description: `Boolean flags: resolved variation value. Other kinds: true when reason is fallthrough.`,
  })
  enabled!: boolean;

  @Field(() => String, { description: `Flag key.` })
  key!: string;

  @Field(() => RolloutFlagKindEnum, {
    description: `Flag value kind of the resolved variation.`,
  })
  kind!: RolloutFlagKind;

  @Field(() => RolloutEvaluationReasonEnum, {
    description: `Why this variation was chosen.`,
  })
  reason!: RolloutEvaluationReason;

  @Field(() => String, {
    description: `JSON-serialized resolved variation value (matches kind).`,
  })
  valueJson!: string;

  @Field(() => Int, {
    description: `Index into the flag's variations array for the resolved value.`,
  })
  variationIndex!: number;
}
