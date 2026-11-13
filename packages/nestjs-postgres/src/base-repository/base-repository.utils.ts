import type {
  DeepPartial,
  Driver,
  EntityMetadata,
  FindManyOptions,
  FindOperator,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  QueryDeepPartialEntity,
} from 'typeorm';
import { IsNull, Raw } from 'typeorm';

import {
  ID_TIMESTAMP_MODEL_CONVENTION,
  UUID_FLAG_MODEL_CONVENTION,
} from '../model-convention/model-convention.constants.ts';
import type { ModelConvention } from '../model-convention/model-convention.types.ts';

/**
 * @description Narrows a driver row to a string-keyed record.
 */
export function isRawRow(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @description Reads the convention a model base class declares as its static
 * `modelConvention`.
 * @throws Error when `target` is not a class extending `BaseModel` or `BaseUuidModel`.
 */
export function resolveModelConvention(target: unknown): ModelConvention {
  const isClass = typeof target === 'function';
  const convention: unknown = isClass
    ? Reflect.get(target, 'modelConvention')
    : undefined;

  if (convention === ID_TIMESTAMP_MODEL_CONVENTION) {
    return ID_TIMESTAMP_MODEL_CONVENTION;
  }

  if (convention === UUID_FLAG_MODEL_CONVENTION) {
    return UUID_FLAG_MODEL_CONVENTION;
  }

  throw new Error(
    `BaseRepository needs an entity class that extends BaseModel or BaseUuidModel`,
  );
}

/**
 * @description A `where` that matches one primary key, or a key operator such as `In`.
 */
export function buildKeyWhere<TEntity extends ObjectLiteral>(
  convention: ModelConvention,
  key: unknown,
): FindOptionsWhere<TEntity>;
export function buildKeyWhere(
  convention: ModelConvention,
  key: unknown,
): object {
  return { [convention.key]: key };
}

/**
 * @description A select of the primary key alone.
 */
export function buildKeySelect<TEntity extends ObjectLiteral>(
  convention: ModelConvention,
): FindManyOptions<TEntity>['select'];
export function buildKeySelect(convention: ModelConvention): object {
  return [convention.key];
}

/**
 * @description Reads an entity's primary key value.
 */
export function readModelKey(
  convention: ModelConvention,
  entity: object,
): unknown {
  return Reflect.get(entity, convention.key);
}

/**
 * @description Matches `is_deleted IS NOT TRUE`, so a nullable flag reads `NULL` as live;
 * `isDeleted: false` would silently drop those rows.
 */
function buildLiveFlagOperator(): FindOperator<unknown> {
  return Raw((column) => {
    return `${column} IS NOT TRUE`;
  });
}

/**
 * @description The caller's `where` restricted to rows that are not soft deleted.
 */
export function withLiveRows<TEntity extends ObjectLiteral>(
  convention: ModelConvention,
  where: FindOptionsWhere<TEntity>,
): FindOptionsWhere<TEntity>;
export function withLiveRows(
  convention: ModelConvention,
  where: object,
): object {
  if (convention.softDelete.kind === 'timestamp') {
    return { ...where, deletedAt: IsNull() };
  }

  return { ...where, isDeleted: buildLiveFlagOperator() };
}

/**
 * @description The `where` a read uses. TypeORM already hides `@DeleteDateColumn` rows from
 * `find*`, so a timestamp model passes through unchanged; a flag model has no such
 * filter, so this adds the live-rows condition.
 */
export function scopeReadWhere<TEntity extends ObjectLiteral>(
  convention: ModelConvention,
  where: FindOptionsWhere<TEntity>,
): FindOptionsWhere<TEntity>;
export function scopeReadWhere(
  convention: ModelConvention,
  where: object,
): object {
  if (convention.softDelete.kind === 'timestamp') {
    return where;
  }

  return withLiveRows(convention, where);
}

/**
 * @description Read options with the live-rows filter a flag model needs; see
 * {@link scopeReadWhere}. Honours `withDeleted: true`, as TypeORM does for timestamp
 * models, and applies the filter to every branch of an array `where`.
 */
export function scopeReadOptions<TEntity extends ObjectLiteral>(
  convention: ModelConvention,
  options: FindManyOptions<TEntity>,
): FindManyOptions<TEntity>;
export function scopeReadOptions<TEntity extends ObjectLiteral>(
  convention: ModelConvention,
  options: FindManyOptions<TEntity> | undefined,
): FindManyOptions<TEntity> | undefined;
export function scopeReadOptions(
  convention: ModelConvention,
  options: FindManyOptions<ObjectLiteral> | undefined,
): FindManyOptions<ObjectLiteral> | undefined {
  if (convention.softDelete.kind === 'timestamp' || options?.withDeleted) {
    return options;
  }

  const where = options?.where ?? {};
  const scoped = Array.isArray(where)
    ? where.map((branch) => withLiveRows(convention, branch))
    : withLiveRows(convention, where);

  return { ...options, where: scoped };
}

/**
 * @description The default ordering for paginated reads, so pages are stable. A uuidv7
 * `id` is chronological on its own; a random `uuid` is not, so it orders by `created_at`
 * first and breaks ties on the key.
 */
export function buildDefaultOrder<TEntity extends ObjectLiteral>(
  convention: ModelConvention,
): FindOptionsOrder<TEntity>;
export function buildDefaultOrder(convention: ModelConvention): object {
  if (convention.key === 'id') {
    return { id: 'ASC' };
  }

  return { createdAt: 'ASC', [convention.key]: 'ASC' };
}

/**
 * @description The values a flag soft delete writes. `updated_at` needs no entry: TypeORM
 * stamps an `@UpdateDateColumn` on every `update` it builds.
 */
export function buildFlagSoftDeleteValues<
  TEntity extends ObjectLiteral,
>(): QueryDeepPartialEntity<TEntity>;
export function buildFlagSoftDeleteValues(): object {
  return { isDeleted: true };
}

/**
 * @description Rebuilds an entity input from a raw `RETURNING *` row by mapping each
 * database column back to its property.
 */
export function mapRawRowToEntityInput<TEntity extends ObjectLiteral>(
  row: Record<string, unknown>,
  columns: EntityMetadata['columns'],
  driver: Driver,
): DeepPartial<TEntity>;
export function mapRawRowToEntityInput(
  row: Record<string, unknown>,
  columns: EntityMetadata['columns'],
  driver: Driver,
): object {
  const input: Record<string, unknown> = {};

  for (const column of columns) {
    if (column.databaseName in row) {
      input[column.propertyName] = driver.prepareHydratedValue(
        row[column.databaseName],
        column,
      );
    }
  }

  return input;
}

/**
 * @description Views a caller's update input as the partial TypeORM's `update` accepts.
 */
export function toUpdateValues<TEntity extends ObjectLiteral>(
  input: object,
): QueryDeepPartialEntity<TEntity>;
export function toUpdateValues(input: object): object {
  return input;
}

/**
 * @description Views created entities as the insert rows TypeORM's `insert` accepts.
 */
export function toInsertRows<TEntity extends ObjectLiteral>(
  entities: readonly TEntity[],
): QueryDeepPartialEntity<TEntity>[];
export function toInsertRows(entities: readonly object[]): object[] {
  return [...entities];
}
