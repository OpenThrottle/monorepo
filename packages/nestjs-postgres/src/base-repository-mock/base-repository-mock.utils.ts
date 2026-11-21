import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import type { DeepPartial, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { vi } from 'vitest';

import type {
  PersistedModel,
  UpdateModelInput,
} from '../base-model/base-model.types.ts';
import type {
  BaseRepositoryMock,
  QueryBuilderMock,
  QueryBuilderMockOptions,
} from './base-repository-mock.types.ts';

/**
 * @description Builds a {@link BaseRepositoryMock} that behaves like an empty
 * table: reads find nothing (`null`, `[]`, an empty page), bulk writes match
 * nothing, and the by-id methods reject with `NotFoundException` as the real
 * ones do. `create` and `createMany` reject until a test stubs them, since an
 * invented row would hide a missing stub. Override per test with
 * `mockResolvedValue` and friends. Test-only: imports `vitest`.
 * @public
 */
export function createBaseRepositoryMock<
  TEntity extends PersistedModel,
  TCreateInput extends DeepPartial<TEntity> = DeepPartial<TEntity>,
  TUpdateInput extends object = UpdateModelInput<TEntity>,
>(tableName = 'mock'): BaseRepositoryMock<TEntity, TCreateInput, TUpdateInput> {
  const notFound = (id: string): Promise<never> => {
    return Promise.reject(
      new NotFoundException(`${tableName} record with ID "${id}" not found`),
    );
  };
  const notStubbed = (method: string): Promise<never> => {
    return Promise.reject(
      new Error(`${tableName}.${method} is not stubbed in this test`),
    );
  };

  return {
    create: vi.fn(() => {
      return notStubbed('create');
    }),
    createMany: vi.fn(() => {
      return notStubbed('createMany');
    }),
    findBy: vi.fn(async () => {
      return [];
    }),
    findById: vi.fn(notFound),
    findByPaginated: vi.fn(async () => {
      return { items: [], totalCount: 0 };
    }),
    findOne: vi.fn(async () => {
      return null;
    }),
    remove: vi.fn(notFound),
    removeMany: vi.fn(async () => {
      return { removedCount: 0 };
    }),
    update: vi.fn(notFound),
    updateMany: vi.fn(async () => {
      return { updateCount: 0 };
    }),
    updateManyReturning: vi.fn(async () => {
      return { data: [], updateCount: 0 };
    }),
  };
}

/**
 * @description Builds a {@link QueryBuilderMock}: every builder method
 * (`where`, `orderBy`, `leftJoinAndSelect`, `setParameters`, ...) returns the
 * mock itself so chains keep working, and the terminal methods resolve to
 * empty results (`getMany` `[]`, `getManyAndCount` `[[], 0]`, `getOne` /
 * `getRawOne` `null`, `getRawMany` `[]`, `getCount` `0`, `execute`
 * `{ affected: 0, raw: [] }`). Pass `options` to seed those results, or call
 * `mockResolvedValue` on a method per test. Test-only: imports `vitest`.
 * @public
 */
export function createQueryBuilderMock<TEntity extends ObjectLiteral>(
  options: QueryBuilderMockOptions<TEntity> = {},
): QueryBuilderMock<TEntity> {
  const chain = () => {
    return vi.fn().mockReturnThis();
  };

  return createMock<SelectQueryBuilder<TEntity>>({
    addGroupBy: chain(),
    addOrderBy: chain(),
    addSelect: chain(),
    andHaving: chain(),
    andWhere: chain(),
    distinct: chain(),
    execute: vi.fn(async () => {
      return options.execute ?? { affected: 0, raw: [] };
    }),
    from: chain(),
    getCount: vi.fn(async () => {
      return options.count ?? 0;
    }),
    getMany: vi.fn(async () => {
      return [...(options.many ?? [])];
    }),
    getManyAndCount: vi.fn(async (): Promise<[TEntity[], number]> => {
      const [rows, total] = options.manyAndCount ?? [[], 0];
      return [[...rows], total];
    }),
    getOne: vi.fn(async () => {
      return options.one ?? null;
    }),
    getRawMany: vi.fn(async () => {
      return [...(options.rawMany ?? [])];
    }),
    getRawOne: vi.fn(async () => {
      return options.rawOne ?? null;
    }),
    groupBy: chain(),
    having: chain(),
    innerJoin: chain(),
    innerJoinAndSelect: chain(),
    leftJoin: chain(),
    leftJoinAndSelect: chain(),
    limit: chain(),
    offset: chain(),
    orHaving: chain(),
    orWhere: chain(),
    orderBy: chain(),
    select: chain(),
    setParameter: chain(),
    setParameters: chain(),
    skip: chain(),
    take: chain(),
    where: chain(),
    withDeleted: chain(),
  });
}
