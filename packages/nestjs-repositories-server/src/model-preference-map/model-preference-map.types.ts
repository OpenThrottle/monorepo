/**
 * A per-user overlay of model-level preferences, keyed by driver → set of model ids. Used for
 * both the disabled-models and favorite-models projections so callers can answer
 * per-(driver, model) questions from a single fetch.
 * @public
 */
export type ModelPreferenceMap = ReadonlyMap<string, ReadonlySet<string>>;

/** A preference row reduced to the two columns the projection reads. */
export interface ModelPreferenceRow {
  readonly driver: string;
  readonly model: string | null;
}
