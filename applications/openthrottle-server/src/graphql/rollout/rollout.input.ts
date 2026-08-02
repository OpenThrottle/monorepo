/**
 * @description GraphQL input types for typed rollout feature-flag mutations.
 * Variation values use valueJson (JSON string); fallthrough uses integer weights.
 */

import { Field, ID, InputType, Int } from '@nestjs/graphql';
import type { RolloutFlagKind } from '@openthrottle/nestjs-rollout';
import { RolloutFlagKindEnum } from './rollout-flag-kind.enum';

@InputType({
  description: `One weighted fallthrough bucket (variation index + integer percent).`,
})
export class RolloutFallthroughBucketInput {
  @Field(() => Int, {
    description: `Index into the flag's variations array.`,
  })
  variation!: number;

  @Field(() => Int, {
    description: `Integer percent weight 0–100. All weights must sum to 100.`,
  })
  weight!: number;
}

@InputType({
  description: `Percentage allocation among variations.`,
})
export class RolloutFallthroughInput {
  @Field(() => [RolloutFallthroughBucketInput], {
    description: `Ordered weighted buckets. Weights must sum to 100.`,
  })
  variations!: RolloutFallthroughBucketInput[];
}

@InputType({
  description: `One variation input. valueJson is JSON-serialized and must match kind.`,
})
export class RolloutFlagVariationInput {
  @Field(() => String, {
    description: `Optional human description.`,
    nullable: true,
  })
  description!: string | null;

  @Field(() => String, {
    description: `Optional display name.`,
    nullable: true,
  })
  name!: string | null;

  @Field(() => String, {
    description: `JSON-serialized variation value (must match the flag kind).`,
  })
  valueJson!: string;
}

@InputType()
export class CreateRolloutFlagInput {
  @Field(() => String, {
    description: `Description of what the flag gates.`,
    nullable: true,
  })
  description!: string | null;

  @Field(() => Boolean, {
    defaultValue: false,
    description: `Master switch. Defaults to off.`,
  })
  enabled!: boolean;

  @Field(() => RolloutFallthroughInput, {
    description: `Fallthrough allocation. Omit for boolean defaults (100% on true). Required for non-boolean kinds.`,
    nullable: true,
  })
  fallthrough!: RolloutFallthroughInput | null;

  @Field(() => String, {
    description: `Unique flag key (kebab/dotted string). Must be unique.`,
  })
  key!: string;

  @Field(() => RolloutFlagKindEnum, {
    description: `Flag kind. Defaults to boolean with LD-like false/true variations.`,
    nullable: true,
  })
  kind!: RolloutFlagKind | null;

  @Field(() => Int, {
    description: `Off / default variation index. Defaults to 0.`,
    nullable: true,
  })
  offVariation!: number | null;

  @Field(() => [String], {
    defaultValue: [],
    description: `RBAC role names to target. Empty => enabled for everyone.`,
  })
  targetRoles!: string[];

  @Field(() => [RolloutFlagVariationInput], {
    description: `Variations. Omit for boolean defaults [{false},{true}]. Required (≥2) for non-boolean kinds.`,
    nullable: true,
  })
  variations!: RolloutFlagVariationInput[] | null;
}

@InputType()
export class UpdateRolloutFlagInput {
  @Field(() => String, {
    description: `Description. Pass null to clear, omit to leave unchanged.`,
    nullable: true,
  })
  description!: string | null;

  @Field(() => Boolean, {
    description: `Master switch. Omit to leave unchanged.`,
    nullable: true,
  })
  enabled!: boolean | null;

  @Field(() => RolloutFallthroughInput, {
    description: `Fallthrough allocation. Omit to leave unchanged.`,
    nullable: true,
  })
  fallthrough!: RolloutFallthroughInput | null;

  @Field(() => ID, { description: `Flag id to update` })
  id!: string;

  @Field(() => String, {
    description: `Flag key. Omit to leave unchanged; must stay unique.`,
    nullable: true,
  })
  key!: string | null;

  @Field(() => RolloutFlagKindEnum, {
    description: `Flag kind. Omit to leave unchanged; changing kind requires matching variations.`,
    nullable: true,
  })
  kind!: RolloutFlagKind | null;

  @Field(() => Int, {
    description: `Off variation index. Omit to leave unchanged.`,
    nullable: true,
  })
  offVariation!: number | null;

  @Field(() => [String], {
    description: `RBAC role names to target. Omit to leave unchanged.`,
    nullable: true,
  })
  targetRoles!: string[] | null;

  @Field(() => [RolloutFlagVariationInput], {
    description: `Variations. Omit to leave unchanged.`,
    nullable: true,
  })
  variations!: RolloutFlagVariationInput[] | null;
}
