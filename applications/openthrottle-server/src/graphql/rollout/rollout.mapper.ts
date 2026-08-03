/**
 * @description Maps between domain RolloutFlag / RolloutEvaluation shapes and
 * GraphQL objects. Variation values travel as JSON-serialized strings
 * (`valueJson`) — repo convention (no GraphQLJSON scalar).
 */

import { BadRequestException } from '@nestjs/common';
import type {
  CreateRolloutFlagInput as DomainCreateRolloutFlagInput,
  RolloutEvaluation,
  RolloutFallthrough,
  RolloutFlag,
  RolloutFlagVariation,
  RolloutVariationValue,
  UpdateRolloutFlagInput as DomainUpdateRolloutFlagInput,
} from '@openthrottle/nestjs-rollout';
import { ROLLOUT_FLAG_KIND } from '@openthrottle/nestjs-rollout';
import type { FeatureFlagObject } from './feature-flag.object';
import type { RolloutFlagObject } from './rollout-flag.object';
import type {
  CreateRolloutFlagInput,
  RolloutFallthroughInput,
  RolloutFlagVariationInput,
  UpdateRolloutFlagInput,
} from './rollout.input';

const isRolloutVariationValue = (
  value: unknown,
): value is RolloutVariationValue => {
  if (value === null) return true;
  if (typeof value === 'boolean') return true;
  if (typeof value === 'number') return true;
  if (typeof value === 'string') return true;
  if (Array.isArray(value)) return value.every(isRolloutVariationValue);
  if (typeof value === 'object') {
    return Object.values(value).every(isRolloutVariationValue);
  }
  return false;
};

const parseValueJson = (
  valueJson: string,
  path: string,
): RolloutVariationValue => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(valueJson);
  } catch {
    throw new BadRequestException(`${path} is not valid JSON`);
  }
  if (!isRolloutVariationValue(parsed)) {
    throw new BadRequestException(
      `${path} must be a JSON boolean, number, string, null, array, or object`,
    );
  }
  return parsed;
};

const toVariationObject = (
  variation: RolloutFlagVariation,
): RolloutFlagObject['variations'][number] => ({
  description: variation.description ?? null,
  name: variation.name ?? null,
  valueJson: JSON.stringify(variation.value),
});

const toFallthroughObject = (
  fallthrough: RolloutFallthrough,
): RolloutFlagObject['fallthrough'] => ({
  variations: fallthrough.variations.map((bucket) => ({
    variation: bucket.variation,
    weight: bucket.weight,
  })),
});

/**
 * @description Maps a domain flag entity to the admin GraphQL object.
 */
export const toRolloutFlagObject = (flag: RolloutFlag): RolloutFlagObject => ({
  createdAt: flag.createdAt,
  description: flag.description,
  enabled: flag.enabled,
  fallthrough: toFallthroughObject(flag.fallthrough),
  id: flag.id,
  key: flag.key,
  kind: flag.kind,
  offVariation: flag.offVariation,
  targetRoles: flag.targetRoles,
  updatedAt: flag.updatedAt,
  variations: flag.variations.map(toVariationObject),
});

/**
 * @description Maps a typed evaluation to the actor-facing FeatureFlagObject.
 * `enabled` is the resolved boolean for boolean flags; for other kinds it is
 * true when the actor received a fallthrough (on) variation.
 */
export const toFeatureFlagObject = (
  evaluation: RolloutEvaluation,
): FeatureFlagObject => ({
  enabled:
    evaluation.kind === ROLLOUT_FLAG_KIND.BOOLEAN
      ? evaluation.value === true
      : evaluation.reason === 'fallthrough',
  key: evaluation.key,
  kind: evaluation.kind,
  reason: evaluation.reason,
  valueJson: JSON.stringify(evaluation.value),
  variationIndex: evaluation.variationIndex,
});

const mapVariationInputs = (
  variations: RolloutFlagVariationInput[] | null | undefined,
): RolloutFlagVariation[] | undefined => {
  if (variations == null) return undefined;
  return variations.map((variation, index) => ({
    ...(variation.description != null && {
      description: variation.description,
    }),
    ...(variation.name != null && { name: variation.name }),
    value: parseValueJson(
      variation.valueJson,
      `variations[${index}].valueJson`,
    ),
  }));
};

const mapFallthroughInput = (
  fallthrough: RolloutFallthroughInput | null | undefined,
): RolloutFallthrough | undefined => {
  if (fallthrough == null) return undefined;
  return {
    variations: fallthrough.variations.map((bucket) => ({
      variation: bucket.variation,
      weight: bucket.weight,
    })),
  };
};

/**
 * @description Maps GraphQL create input → domain create input.
 */
export const toDomainCreateInput = (
  input: CreateRolloutFlagInput,
): DomainCreateRolloutFlagInput => {
  const fallthrough = mapFallthroughInput(input.fallthrough);
  const variations = mapVariationInputs(input.variations);
  return {
    description: input.description ?? null,
    enabled: input.enabled,
    ...(fallthrough !== undefined && { fallthrough }),
    key: input.key,
    ...(input.kind != null && { kind: input.kind }),
    ...(input.offVariation != null && { offVariation: input.offVariation }),
    targetRoles: input.targetRoles,
    ...(variations !== undefined && { variations }),
  };
};

/**
 * @description Maps GraphQL update input → domain patch (only provided fields).
 */
export const toDomainUpdatePatch = (
  input: UpdateRolloutFlagInput,
): DomainUpdateRolloutFlagInput => {
  const fallthrough = mapFallthroughInput(input.fallthrough);
  const variations = mapVariationInputs(input.variations);
  return {
    ...(input.description !== undefined && {
      description: input.description,
    }),
    ...(input.enabled != null && { enabled: input.enabled }),
    ...(fallthrough !== undefined && { fallthrough }),
    ...(input.key != null && { key: input.key }),
    ...(input.kind != null && { kind: input.kind }),
    ...(input.offVariation != null && { offVariation: input.offVariation }),
    ...(input.targetRoles != null && { targetRoles: input.targetRoles }),
    ...(variations !== undefined && { variations }),
  };
};
