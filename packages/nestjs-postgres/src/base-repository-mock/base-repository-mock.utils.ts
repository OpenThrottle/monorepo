import { NotFoundException } from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import { vi } from 'vitest';

import type {
  PersistedModel,
  UpdateModelInput,
} from '../base-model/base-model.types.ts';
import type { BaseRepositoryMock } from './base-repository-mock.types.ts';

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
      return {
        data: [],
        pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 0 },
      };
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
