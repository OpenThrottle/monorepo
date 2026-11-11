import type {
  DeepPartial,
  Driver,
  EntityMetadata,
  FindOptionsOrder,
  FindOptionsWhere,
  ObjectLiteral,
  QueryDeepPartialEntity,
} from 'typeorm';
import { IsNull } from 'typeorm';

/**
 * @description Narrows a driver row to a string-keyed record.
 */
export function isRawRow(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @description A `where` that matches one primary key.
 */
export function buildIdWhere<TEntity extends ObjectLiteral>(
  id: string,
): FindOptionsWhere<TEntity>;
export function buildIdWhere(id: string): object {
  return { id };
}

/**
 * @description A `where` that matches an id list.
 */
export function buildWhereWithIds<TEntity extends ObjectLiteral>(
  operator: unknown,
): FindOptionsWhere<TEntity>;
export function buildWhereWithIds(operator: unknown): object {
  return { id: operator };
}

/**
 * @description The caller's `where` restricted to rows that are not soft deleted.
 */
export function withLiveRows<TEntity extends ObjectLiteral>(
  where: FindOptionsWhere<TEntity>,
): FindOptionsWhere<TEntity>;
export function withLiveRows(where: object): object {
  return { ...where, deletedAt: IsNull() };
}

/**
 * @description The default ordering for paginated reads: primary key ascending, so pages
 * are stable.
 */
export function buildDefaultOrder<
  TEntity extends ObjectLiteral,
>(): FindOptionsOrder<TEntity>;
export function buildDefaultOrder(): object {
  return { id: 'ASC' };
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
