import type { RolloutFlagKindValue } from '../config/rollout-flag-kind';
import type {
  RolloutFlagCatalog,
  RolloutFlagKey,
  RolloutFlagValue,
  RolloutFlagValueByKind,
} from '../types';

/**
 * Resolved values map for a catalog (defaults only).
 *
 * @public
 */
export type RolloutResolvedValues<TCatalog extends RolloutFlagCatalog> = {
  readonly [K in RolloutFlagKey<TCatalog>]: RolloutFlagValue<TCatalog, K>;
};

type MutableResolvedValues = Record<
  string,
  RolloutFlagValueByKind[RolloutFlagKindValue]
>;

/**
 * Build a values map from catalog defaults.
 *
 * @public
 */
export const defaultsFromCatalog = <TCatalog extends RolloutFlagCatalog>(
  catalog: TCatalog,
): RolloutResolvedValues<TCatalog> => {
  const values: MutableResolvedValues = {};

  for (const [key, definition] of Object.entries(catalog)) {
    values[key] = definition.defaultValue;
  }

  return freezeResolvedValues(catalog, values);
};

/**
 * @description Whether `value` has the TypeScript type `kind` declares. Mirrors
 * `RolloutFlagValueByKind` exactly — deliberately looser than
 * `isRolloutFlagValueForKind`, which also rejects `NaN` and non-object JSON
 * defaults — so a catalog that type-checks always seals.
 */
const hasKindType = (kind: RolloutFlagKindValue, value: unknown): boolean => {
  if (kind === 'json') {
    return (
      value === null ||
      ['boolean', 'number', 'object', 'string'].includes(typeof value)
    );
  }

  return typeof value === kind;
};

/**
 * @description Whether `values` holds, for every catalog key, a value of that
 * key's declared kind — which is exactly what {@link RolloutResolvedValues}
 * promises.
 */
const isResolvedValuesFor = <TCatalog extends RolloutFlagCatalog>(
  catalog: TCatalog,
  values: Readonly<Record<string, unknown>>,
): values is RolloutResolvedValues<TCatalog> => {
  return Object.entries(catalog).every(([key, definition]) => {
    return hasKindType(definition.kind, values[key]);
  });
};

/**
 * Seal a mutable values bag as the catalog-resolved map.
 * `Object.entries` erases key→value correlation, so the bag is re-checked
 * against the catalog rather than asserted.
 */
export const freezeResolvedValues = <TCatalog extends RolloutFlagCatalog>(
  catalog: TCatalog,
  values: MutableResolvedValues,
): RolloutResolvedValues<TCatalog> => {
  if (!isResolvedValuesFor(catalog, values)) {
    throw new Error(
      '@openthrottle/react-router-rollout: resolved values do not match the catalog kinds',
    );
  }

  return values;
};
