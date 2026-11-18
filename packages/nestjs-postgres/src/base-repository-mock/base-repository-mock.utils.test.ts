import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { TestHardDeleteRecord } from '../base-repository/testing/test-hard-delete-record/test-hard-delete-record.entity.ts';
import type { TestRecord } from '../base-repository/testing/test-record/test-record.entity.ts';
import { createBaseRepositoryMock } from './base-repository-mock.utils.ts';

/** A fixed timestamp, so the test never reads the real clock. */
const FIXED_NOW = new Date('2026-11-01T00:00:00.000Z');

describe('createBaseRepositoryMock', () => {
  describe('reads', () => {
    it('behave like an empty table', async () => {
      const repository = createBaseRepositoryMock<TestRecord>();

      await expect(repository.findOne({ where: {} })).resolves.toBeNull();
      await expect(repository.findBy()).resolves.toEqual([]);
      await expect(repository.findByPaginated()).resolves.toEqual({
        data: [],
        pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 0 },
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
