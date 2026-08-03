/**
 * @description Defaults, serializers, parsers, and summary helpers for typed
 * rollout flag create/edit forms (kind, variations, offVariation, fallthrough).
 */

import type { RolloutFlagFieldsFragment } from '~/__generated__/graphql';
import { RolloutFlagKind } from '~/__generated__/graphql';
import type { RolloutFlagKindOption } from '~/routing/settings/data/data.rollout-kinds';
import { isRolloutFlagKind } from '~/routing/settings/data/data.rollout-kinds';
import { ROLLOUT_COPY } from '~/routing/settings/data/data.copy';

/** Form-facing variation row (valueJson is already JSON-serialized). */
export interface RolloutFormVariation {
  description: string;
  name: string;
  valueJson: string;
}

/** Form-facing fallthrough bucket. */
export interface RolloutFormFallthroughBucket {
  variation: number;
  weight: number;
}

/** Full typed config payload submitted via hidden form fields. */
export interface RolloutFormTypedConfig {
  fallthrough: { variations: RolloutFormFallthroughBucket[] };
  kind: RolloutFlagKindOption;
  offVariation: number;
  variations: RolloutFormVariation[];
}

export type RolloutTypedConfigParseResult =
  | { config: RolloutFormTypedConfig; ok: true }
  | { error: string; ok: false };

const equalSplitWeights = (count: number): RolloutFormFallthroughBucket[] => {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, index) => ({
    variation: index,
    weight: index === 0 ? base + remainder : base,
  }));
};

const blankVariation = (valueJson: string): RolloutFormVariation => ({
  description: '',
  name: '',
  valueJson,
});

/** Default editable raw string when adding a variation of the given kind. */
export const defaultRawValueForKind = (kind: RolloutFlagKindOption): string => {
  switch (kind) {
    case RolloutFlagKind.Boolean:
      return 'false';
    case RolloutFlagKind.Number:
      return '0';
    case RolloutFlagKind.Json:
      return '{}';
    case RolloutFlagKind.String:
      return '';
  }
};

/** Label for a variation row / allocation picker (name, else valueJson). */
export const formatRolloutVariationLabel = (
  variation: Pick<RolloutFormVariation, 'name' | 'valueJson'> | undefined,
  index: number,
): string => {
  const name = variation?.name.trim();
  if (name) return name;
  return variation?.valueJson ?? `${ROLLOUT_COPY.variationIndexPrefix}${index}`;
};

/** LD-like boolean defaults: false/true, off=0, 100% on true. */
export const defaultTypedConfigForKind = (
  kind: RolloutFlagKindOption,
): RolloutFormTypedConfig => {
  switch (kind) {
    case RolloutFlagKind.Boolean:
      return {
        fallthrough: { variations: [{ variation: 1, weight: 100 }] },
        kind,
        offVariation: 0,
        variations: [blankVariation('false'), blankVariation('true')],
      };
    case RolloutFlagKind.Number:
      return {
        fallthrough: { variations: equalSplitWeights(2) },
        kind,
        offVariation: 0,
        variations: [blankVariation('0'), blankVariation('1')],
      };
    case RolloutFlagKind.Json:
      return {
        fallthrough: { variations: equalSplitWeights(2) },
        kind,
        offVariation: 0,
        variations: [blankVariation('{}'), blankVariation('{}')],
      };
    case RolloutFlagKind.String:
      return {
        fallthrough: { variations: equalSplitWeights(2) },
        kind,
        offVariation: 0,
        variations: [
          blankVariation(JSON.stringify('control')),
          blankVariation(JSON.stringify('treatment')),
        ],
      };
  }
};

/** Seed the controlled form from an existing GraphQL flag fragment. */
export const typedConfigFromFlag = (
  flag: Pick<
    RolloutFlagFieldsFragment,
    'fallthrough' | 'kind' | 'offVariation' | 'variations'
  >,
): RolloutFormTypedConfig => {
  const kind = isRolloutFlagKind(flag.kind)
    ? flag.kind
    : RolloutFlagKind.Boolean;
  return {
    fallthrough: {
      variations: flag.fallthrough.variations.map((bucket) => ({
        variation: bucket.variation,
        weight: bucket.weight,
      })),
    },
    kind,
    offVariation: flag.offVariation,
    variations: flag.variations.map((variation) => ({
      description: variation.description ?? '',
      name: variation.name ?? '',
      valueJson: variation.valueJson,
    })),
  };
};

/** Integer percent weights for fallthrough; must sum to 100. */
export const sumFallthroughWeights = (
  buckets: readonly RolloutFormFallthroughBucket[],
): number => buckets.reduce((sum, bucket) => sum + bucket.weight, 0);

export const fallthroughWeightsAreValid = (
  buckets: readonly RolloutFormFallthroughBucket[],
): boolean => sumFallthroughWeights(buckets) === 100;

/**
 * Serialize a raw UI string into valueJson for the given kind.
 * boolean/number/json parse; string JSON-encodes the raw text.
 */
export const encodeVariationValueJson = (
  kind: RolloutFlagKindOption,
  raw: string,
): { error: string } | { valueJson: string } => {
  const trimmed = raw.trim();
  switch (kind) {
    case RolloutFlagKind.Boolean: {
      if (trimmed === 'true' || trimmed === 'false') {
        return { valueJson: trimmed };
      }
      return { error: ROLLOUT_COPY.variationBooleanInvalid };
    }
    case RolloutFlagKind.Number: {
      if (trimmed.length === 0 || Number.isNaN(Number(trimmed))) {
        return { error: ROLLOUT_COPY.variationNumberInvalid };
      }
      return { valueJson: JSON.stringify(Number(trimmed)) };
    }
    case RolloutFlagKind.String:
      return { valueJson: JSON.stringify(raw) };
    case RolloutFlagKind.Json: {
      try {
        JSON.parse(trimmed);
        return { valueJson: trimmed };
      } catch {
        return { error: ROLLOUT_COPY.variationJsonInvalid };
      }
    }
  }
};

/** Decode valueJson to the editable UI string for the kind. */
export const decodeVariationValueForEdit = (
  kind: RolloutFlagKindOption,
  valueJson: string,
): string => {
  if (kind === RolloutFlagKind.String) {
    try {
      const parsed: unknown = JSON.parse(valueJson);
      return typeof parsed === 'string' ? parsed : valueJson;
    } catch {
      return valueJson;
    }
  }
  if (kind === RolloutFlagKind.Number) {
    try {
      const parsed: unknown = JSON.parse(valueJson);
      return typeof parsed === 'number' ? String(parsed) : valueJson;
    } catch {
      return valueJson;
    }
  }
  return valueJson;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validateValueJsonForKind = (
  kind: RolloutFlagKindOption,
  valueJson: string,
): string | null => {
  try {
    const parsed: unknown = JSON.parse(valueJson);
    switch (kind) {
      case RolloutFlagKind.Boolean:
        return typeof parsed === 'boolean'
          ? null
          : ROLLOUT_COPY.variationBooleanInvalid;
      case RolloutFlagKind.Number:
        return typeof parsed === 'number' && Number.isFinite(parsed)
          ? null
          : ROLLOUT_COPY.variationNumberInvalid;
      case RolloutFlagKind.String:
        return typeof parsed === 'string'
          ? null
          : ROLLOUT_COPY.variationStringInvalid;
      case RolloutFlagKind.Json:
        return null;
    }
  } catch {
    return kind === RolloutFlagKind.Json
      ? ROLLOUT_COPY.variationJsonInvalid
      : ROLLOUT_COPY.variationShapeError;
  }
};

const parseVariationsJson = (
  raw: string,
  kind: RolloutFlagKindOption,
): { error: string } | { variations: RolloutFormVariation[] } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: ROLLOUT_COPY.variationsParseError };
  }
  if (!Array.isArray(parsed) || parsed.length < 2) {
    return { error: ROLLOUT_COPY.variationsMinError };
  }

  const variations: RolloutFormVariation[] = [];
  for (const [index, entry] of parsed.entries()) {
    if (!isPlainRecord(entry)) {
      return {
        error: `${ROLLOUT_COPY.variationShapeError} (${index}).`,
      };
    }
    if (typeof entry.valueJson !== 'string') {
      return {
        error: `${ROLLOUT_COPY.variationShapeError} (${index}).`,
      };
    }
    const valueError = validateValueJsonForKind(kind, entry.valueJson);
    if (valueError) {
      return { error: `${valueError} (${index}).` };
    }
    variations.push({
      description:
        typeof entry.description === 'string' ? entry.description : '',
      name: typeof entry.name === 'string' ? entry.name : '',
      valueJson: entry.valueJson,
    });
  }
  return { variations };
};

const parseFallthroughJson = (
  raw: string,
  variationCount: number,
):
  | { error: string }
  | { fallthrough: { variations: RolloutFormFallthroughBucket[] } } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: ROLLOUT_COPY.fallthroughParseError };
  }
  if (!isPlainRecord(parsed) || !Array.isArray(parsed.variations)) {
    return { error: ROLLOUT_COPY.fallthroughParseError };
  }
  const bucketsUnknown = parsed.variations;
  const buckets: RolloutFormFallthroughBucket[] = [];
  for (const bucket of bucketsUnknown) {
    if (!isPlainRecord(bucket)) {
      return { error: ROLLOUT_COPY.fallthroughParseError };
    }
    if (
      typeof bucket.variation !== 'number' ||
      !Number.isInteger(bucket.variation) ||
      typeof bucket.weight !== 'number' ||
      !Number.isInteger(bucket.weight)
    ) {
      return { error: ROLLOUT_COPY.fallthroughParseError };
    }
    if (bucket.variation < 0 || bucket.variation >= variationCount) {
      return { error: ROLLOUT_COPY.fallthroughIndexError };
    }
    if (bucket.weight < 0 || bucket.weight > 100) {
      return { error: ROLLOUT_COPY.fallthroughWeightRangeError };
    }
    buckets.push({ variation: bucket.variation, weight: bucket.weight });
  }
  if (!fallthroughWeightsAreValid(buckets)) {
    return { error: ROLLOUT_COPY.fallthroughSumError };
  }
  return { fallthrough: { variations: buckets } };
};

/**
 * Parse typed config from create/update FormData fields:
 * `kind`, `offVariation`, `variationsJson`, `fallthroughJson`.
 */
export const parseRolloutTypedConfig = (
  formData: FormData,
): RolloutTypedConfigParseResult => {
  const kindRaw = formData.get('kind');
  if (typeof kindRaw !== 'string' || !isRolloutFlagKind(kindRaw)) {
    return { error: ROLLOUT_COPY.kindRequiredError, ok: false };
  }

  const offRaw = formData.get('offVariation');
  const offVariation =
    typeof offRaw === 'string' && offRaw.trim().length > 0
      ? Number(offRaw)
      : Number.NaN;
  if (!Number.isInteger(offVariation) || offVariation < 0) {
    return { error: ROLLOUT_COPY.offVariationError, ok: false };
  }

  const variationsRaw = formData.get('variationsJson');
  if (typeof variationsRaw !== 'string') {
    return { error: ROLLOUT_COPY.variationsParseError, ok: false };
  }
  const variationsResult = parseVariationsJson(variationsRaw, kindRaw);
  if ('error' in variationsResult) {
    return { error: variationsResult.error, ok: false };
  }

  if (offVariation >= variationsResult.variations.length) {
    return { error: ROLLOUT_COPY.offVariationError, ok: false };
  }

  const fallthroughRaw = formData.get('fallthroughJson');
  if (typeof fallthroughRaw !== 'string') {
    return { error: ROLLOUT_COPY.fallthroughParseError, ok: false };
  }
  const fallthroughResult = parseFallthroughJson(
    fallthroughRaw,
    variationsResult.variations.length,
  );
  if ('error' in fallthroughResult) {
    return { error: fallthroughResult.error, ok: false };
  }

  return {
    config: {
      fallthrough: fallthroughResult.fallthrough,
      kind: kindRaw,
      offVariation,
      variations: variationsResult.variations,
    },
    ok: true,
  };
};

/** GraphQL create/update input slice from a validated typed config. */
export const toRolloutGraphqlTypedInput = (
  config: RolloutFormTypedConfig,
): {
  fallthrough: { variations: RolloutFormFallthroughBucket[] };
  kind: RolloutFlagKindOption;
  offVariation: number;
  variations: Array<{
    description?: string | null;
    name?: string | null;
    valueJson: string;
  }>;
} => ({
  fallthrough: config.fallthrough,
  kind: config.kind,
  offVariation: config.offVariation,
  variations: config.variations.map((variation) => ({
    description: variation.description.trim() || null,
    name: variation.name.trim() || null,
    valueJson: variation.valueJson,
  })),
});
