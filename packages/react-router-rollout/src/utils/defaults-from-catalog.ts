import type { RolloutFlagKind } from '../config/rollout-flag-kind';
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
  RolloutFlagValueByKind[RolloutFlagKind]
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

  return freezeResolvedValues(values);
};

/**
 * Seal a mutable values bag as the catalog-resolved map.
 * `Object.entries` erases key→value correlation; this is the intentional boundary.
 */
export const freezeResolvedValues = <TCatalog extends RolloutFlagCatalog>(
  values: MutableResolvedValues,
): RolloutResolvedValues<TCatalog> =>
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.entries loses key→value generics
  values as RolloutResolvedValues<TCatalog>;
