import {
  isRolloutFlagKind,
  ROLLOUT_FLAG_KIND,
  type RolloutFlagKind,
} from './rollout-flag-kind';
import type { RolloutFlagValueByKind, RolloutJsonValue } from './types';

/**
 * Whether a value is valid for the given kind (mirrors nestjs-rollout checks).
 * Narrows `value` to the TypeScript type for that kind.
 *
 * @public
 */
export const isRolloutFlagValueForKind = <K extends RolloutFlagKind>(
  kind: K,
  value: unknown,
): value is RolloutFlagValueByKind[K] => {
  switch (kind) {
    case ROLLOUT_FLAG_KIND.BOOLEAN:
      return typeof value === 'boolean';
    case ROLLOUT_FLAG_KIND.STRING:
      return typeof value === 'string';
    case ROLLOUT_FLAG_KIND.NUMBER:
      return typeof value === 'number' && Number.isFinite(value);
    case ROLLOUT_FLAG_KIND.JSON:
      return isJsonObjectOrArray(value);
    default:
      return false;
  }
};

/**
 * Loose catalog shape for runtime validation (kinds/defaults checked at runtime).
 *
 * @public
 */
export type RolloutFlagCatalogInput = Readonly<
  Record<
    string,
    {
      readonly defaultValue: unknown;
      readonly kind: unknown;
    }
  >
>;

/**
 * Validate every catalog entry has a known kind and a matching defaultValue.
 * Throws on mismatch. Does not use an `asserts` predicate so typed catalogs
 * keep their inferred key → value mapping after validation.
 *
 * @public
 */
export function assertRolloutFlagCatalog(
  catalog: RolloutFlagCatalogInput,
): void {
  for (const [key, definition] of Object.entries(catalog)) {
    if (!isRolloutFlagKind(definition.kind)) {
      throw new Error(
        `@openthrottle/react-router-rollout: flag "${key}" has unknown kind "${String(definition.kind)}"`,
      );
    }

    if (!isRolloutFlagValueForKind(definition.kind, definition.defaultValue)) {
      throw new Error(
        `@openthrottle/react-router-rollout: flag "${key}" defaultValue does not match kind "${definition.kind}"`,
      );
    }
  }
}

const isJsonObjectOrArray = (value: unknown): value is RolloutJsonValue => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  try {
    JSON.parse(JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};
