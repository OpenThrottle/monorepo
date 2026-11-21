import { NotFoundException } from '@nestjs/common';
import type { SelectQueryBuilder } from 'typeorm';
import { describe, expect, it } from 'vitest';

import type { TestHardDeleteRecord } from '../base-repository/testing/test-hard-delete-record/test-hard-delete-record.entity.ts';
import type { TestRecord } from '../base-repository/testing/test-record/test-record.entity.ts';
import {
  createBaseRepositoryMock,
  createQueryBuilderMock,
} from './base-repository-mock.utils.ts';

/** A fixed timestamp, so the test never reads the real clock. */
const FIXED_NOW = new Date('2026-11-01T00:00:00.000Z');

describe('createBaseRepositoryMock', () => {
  describe('reads', () => {
    it('behave like an empty table', async () => {
      const repository = createBaseRepositoryMock<TestRecord>();

      await expect(repository.findOne({ where: {} })).resolves.toBeNull();
      await expect(repository.findBy()).resolves.toEqual([]);
      await expect(repository.findByPaginated()).resolves.toEqual({
        items: [],
        totalCount: 0,
      });
    });

    it('reject the by-id methods with NotFoundException', async () => {
      const repository = createBaseRepositoryMock<TestRecord>('test_records');

      await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
      await expect(repository.update('a', {})).rejects.toThrow(
        'test_records record with ID "a" not found',
      );
      await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    });
  });

  describe('writes', () => {
    it('match nothing in bulk', async () => {
      const repository = createBaseRepositoryMock<TestRecord>();

      await expect(repository.removeMany({ quantity: 1 })).resolves.toEqual({
        removedCount: 0,
      });
      await expect(
        repository.updateMany({ quantity: 1 }, { quantity: 2 }),
      ).resolves.toEqual({ updateCount: 0 });
      await expect(
        repository.updateManyReturning({ quantity: 1 }, { quantity: 2 }),
      ).resolves.toEqual({ data: [], updateCount: 0 });
    });

    it('reject create until a test stubs it', async () => {
      const repository = createBaseRepositoryMock<TestRecord>('test_records');
      const input = { note: null, ownerId: null, quantity: 1 };

      await expect(repository.create(input)).rejects.toThrow(
        'test_records.create is not stubbed in this test',
      );
      await expect(repository.createMany([input])).rejects.toThrow(
        'test_records.createMany is not stubbed in this test',
      );
    });

    it('returns what a test stubs', async () => {
      const repository = createBaseRepositoryMock<TestRecord>();
      const row = {
        createdAt: FIXED_NOW,
        deletedAt: null,
        id: 'a',
        note: null,
        ownerId: null,
        quantity: 1,
        updatedAt: FIXED_NOW,
      };

      repository.create.mockResolvedValue(row);

      await expect(
        repository.create({ note: null, ownerId: null, quantity: 1 }),
      ).resolves.toBe(row);
    });
  });

  describe('a no-soft-delete entity', () => {
    it('types and behaves the same, with updatedAt kept out of the create input', async () => {
      const repository = createBaseRepositoryMock<TestHardDeleteRecord>(
        'test_hard_delete_records',
      );
      const row = {
        createdAt: FIXED_NOW,
        id: 'a',
        note: null,
        quantity: 1,
        updatedAt: FIXED_NOW,
      };

      repository.create.mockResolvedValue(row);

      await expect(
        repository.create({ note: null, quantity: 1 }),
      ).resolves.toBe(row);
      await expect(repository.remove('b')).rejects.toThrow(
        'test_hard_delete_records record with ID "b" not found',
      );
      await expect(repository.removeMany({ quantity: 1 })).resolves.toEqual({
        removedCount: 0,
      });
    });
  });
});

describe('createQueryBuilderMock', () => {
  const acceptsBuilder = (builder: SelectQueryBuilder<TestRecord>) => {
    return builder;
  };

  describe('chaining', () => {
    it('returns the mock from every builder method and records the calls', () => {
      const builder = createQueryBuilderMock<TestRecord>();

      const chained = acceptsBuilder(builder)
        .where('a = :a', { a: 1 })
        .andWhere('b = 2')
        .orderBy('a', 'ASC')
        .skip(5)
        .take(10);

      expect(chained).toBe(builder);
      expect(builder.where).toHaveBeenCalledWith('a = :a', { a: 1 });
      expect(builder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('terminal defaults', () => {
    it('resolve to empty results', async () => {
      const builder = createQueryBuilderMock<TestRecord>();

      await expect(builder.getMany()).resolves.toEqual([]);
      await expect(builder.getManyAndCount()).resolves.toEqual([[], 0]);
      await expect(builder.getOne()).resolves.toBeNull();
      await expect(builder.getRawMany()).resolves.toEqual([]);
      await expect(builder.getRawOne()).resolves.toBeNull();
      await expect(builder.getCount()).resolves.toBe(0);
      await expect(builder.execute()).resolves.toEqual({
        affected: 0,
        raw: [],
      });
    });
  });

  describe('overrides', () => {
    it('seed results from options', async () => {
      const builder = createQueryBuilderMock<TestRecord>({
        count: 3,
        rawOne: { count: 7 },
      });

      await expect(builder.getCount()).resolves.toBe(3);
      await expect(builder.getRawOne()).resolves.toEqual({ count: 7 });
    });

    it('can be re-stubbed per test', async () => {
      const builder = createQueryBuilderMock<TestRecord>();
      builder.getRawMany.mockResolvedValue([{ id: 'x' }]);

      await expect(builder.getRawMany()).resolves.toEqual([{ id: 'x' }]);
    });
  });
});
