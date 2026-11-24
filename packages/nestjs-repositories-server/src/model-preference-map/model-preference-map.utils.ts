import type {
  ModelPreferenceMap,
  ModelPreferenceRow,
} from './model-preference-map.types.ts';

/**
 * @description Builds a driver → set-of-models map from preference rows, skipping rows whose
 * `model` is null (an agent-level row, not a model-level one).
 * @public
 */
export function toModelPreferenceMap(
  rows: readonly ModelPreferenceRow[],
): ModelPreferenceMap {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.model === null) {
      continue;
    }
    const existing = map.get(row.driver);
    if (existing) {
      existing.add(row.model);
    } else {
      map.set(row.driver, new Set([row.model]));
    }
  }
  return map;
}
