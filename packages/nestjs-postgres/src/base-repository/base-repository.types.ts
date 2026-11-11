/**
 * @description Where a page sits in its result set.
 * @public
 */
export interface PageInfo {
  readonly currentPage: number;
  readonly hasNextPage: boolean;
  readonly totalCount: number;
}

/**
 * @description One page of rows plus its {@link PageInfo}.
 * @public
 */
export interface FindByPaginatedResults<TEntity> {
  readonly data: TEntity[];
  readonly pageInfo: PageInfo;
}

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
