import { assertRolloutFlagCatalog } from './assert-rollout-flag-catalog';
import type { RolloutFlagCatalog } from './types';

/**
 * Declare the app's full flag catalog (key, kind, default). Preserves literal
 * key → value types via a `const` type parameter so hooks can infer returns.
 *
 * @example
 * ```ts
 * const flags = defineRolloutFlags({
 *   'billing.invoices': { kind: 'boolean', defaultValue: false },
 *   'theme.mode': { kind: 'string', defaultValue: 'system' },
 * });
 * ```
 *
 * @public
 */
export function defineRolloutFlags<const TCatalog extends RolloutFlagCatalog>(
  catalog: TCatalog,
): TCatalog {
  assertRolloutFlagCatalog(catalog);
  return catalog;
}
