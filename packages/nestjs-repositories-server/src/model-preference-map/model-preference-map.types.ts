/**
 * A per-user overlay of model-level preferences, keyed by backend → set of model ids. Used for
 * both the disabled-models and favorite-models projections so callers can answer
 * per-(backend, model) questions from a single fetch.
 * @public
 */
export type ModelPreferenceMap = ReadonlyMap<string, ReadonlySet<string>>;

/** A preference row reduced to the two columns the projection reads. */
export interface ModelPreferenceRow {
  readonly backend: string;
  readonly model: string | null;
}
