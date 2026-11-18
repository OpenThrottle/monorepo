import type {
  FindManyOptions,
  FindOptionsOrder,
  ObjectLiteral,
  Repository,
} from 'typeorm';

/**
 * @description Anything that exposes a TypeORM repository — every `*Service` in
 * this package satisfies this via its `getRepository()` method, so the loader
 * factories accept services directly.
 */
export interface RepositoryAccessor<TEntity extends ObjectLiteral> {
  getRepository(): Repository<TEntity>;
}

/**
 * @description Anything that reads rows with `FindManyOptions` — a `BaseRepository`
 * satisfies this through its `findBy`, which already scopes reads to live rows.
 * @public
 */
export interface RepositoryFindSource<TEntity extends ObjectLiteral> {
  findBy(options?: FindManyOptions<TEntity>): Promise<TEntity[]>;
}

/**
 * @description What the loader factories read rows from: a service exposing `getRepository()`
 * (the unmoved services) or a `BaseRepository`-like source.
 * @public
 */
export type EntityLoaderSource<TEntity extends ObjectLiteral> =
  RepositoryAccessor<TEntity> | RepositoryFindSource<TEntity>;

/**
 * @description Options for {@link createCollectionByColumnLoader}.
 */
export interface CollectionByColumnLoaderOptions<
  TEntity extends ObjectLiteral,
> {
  /** Foreign-key column to group rows by (e.g. `projectId`). */
  readonly column: keyof TEntity & string;
  /** Optional ordering applied to the single batched query. */
  readonly order?: FindOptionsOrder<TEntity>;
}

/**
 * @description Optional IN-filter applied on top of the grouped count query
 * (e.g. count only tasks whose `status` is in COMPLETED/PROMOTED/SKIPPED).
 */
export interface GroupedCountColumnInFilter<TEntity extends ObjectLiteral> {
  /** Column to constrain (e.g. `status`). */
  readonly column: keyof TEntity & string;
  /** Allowed values for that column (`IN (...)`). */
  readonly values: readonly string[];
}

/**
 * @description Options for {@link createGroupedCountLoader}.
 */
export interface GroupedCountLoaderOptions<TEntity extends ObjectLiteral> {
  /** Foreign-key column to count rows by (e.g. `planId`). */
  readonly column: keyof TEntity & string;
  /** Optional additional `column IN (values)` predicate on the count query. */
  readonly filter?: GroupedCountColumnInFilter<TEntity>;
}
