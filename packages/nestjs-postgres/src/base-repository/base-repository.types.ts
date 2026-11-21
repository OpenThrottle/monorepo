/**
 * @description The rows an update touched, reloaded, plus how many it changed.
 * @public
 */
export interface UpdateManyResults<TEntity> {
  readonly data: TEntity[];
  readonly updateCount: number;
}

/**
 * @description How many rows a bulk soft delete removed.
 * @public
 */
export interface RemoveManyResults {
  readonly removedCount: number;
}
