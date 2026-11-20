import 'reflect-metadata';

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { asMock } from '@openthrottle/nestjs-testing';
import type { EntityMetadata, Repository } from 'typeorm';
import { In } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseHardDeleteModel } from '../../../base-hard-delete-model/base-hard-delete-model.entity.ts';
import { ID_HARD_DELETE_MODEL_CONVENTION } from '../../../model-convention/model-convention.constants.ts';
import {
  POSTGRES_DEFAULT_PAGE_SIZE,
  POSTGRES_MAX_RETURNING_ROWS,
} from '../../base-repository.constants.ts';
import {
  resolveModelConvention,
  scopeReadWhere,
  withLiveRows,
} from '../../base-repository.utils.ts';
import { TestHardDeleteRecord } from './test-hard-delete-record.entity.ts';
import {
  testHardDeleteRecordFactory,
  testHardDeleteRecordInputFactory,
} from './test-hard-delete-record.factory.ts';
import { TestHardDeleteRecordRepository } from './test-hard-delete-record.repository.ts';

const buildHarness = () => {
  const execute = vi.fn();
  const builder = {
    delete: vi.fn(),
    execute,
    returning: vi.fn(),
    set: vi.fn(),
    softDelete: vi.fn(),
    update: vi.fn(),
    where: vi.fn(),
  };

  builder.delete.mockReturnValue(builder);
  builder.returning.mockReturnValue(builder);
  builder.set.mockReturnValue(builder);
  builder.softDelete.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);

  const typeorm = {
    create: vi.fn((input: unknown) => input),
    createQueryBuilder: vi.fn(() => builder),
    delete: vi.fn(),
    find: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn(),
    manager: {
      dataSource: {
        driver: { prepareHydratedValue: vi.fn((value: unknown) => value) },
      },
    },
    metadata: {
      columns: asMock<EntityMetadata['columns']>([
        { databaseName: 'id', propertyName: 'id' },
        { databaseName: 'note', propertyName: 'note' },
      ]),
    },
    save: vi.fn(async (entity: unknown) => entity),
    softDelete: vi.fn(),
    target: TestHardDeleteRecord,
    update: vi.fn(),
  };
  const repository = new TestHardDeleteRecordRepository(
    asMock<Repository<TestHardDeleteRecord>>(typeorm),
  );

  return { builder, repository, typeorm };
};

describe('BaseRepository (id key + no soft delete)', () => {
  let harness: ReturnType<typeof buildHarness>;

  beforeEach(() => {
    harness = buildHarness();
  });

  describe('resolveModelConvention', () => {
    it('reads the hard-delete convention from the base and its subclasses', () => {
      expect(resolveModelConvention(BaseHardDeleteModel)).toBe(
        ID_HARD_DELETE_MODEL_CONVENTION,
      );
      expect(resolveModelConvention(TestHardDeleteRecord)).toBe(
        ID_HARD_DELETE_MODEL_CONVENTION,
      );
    });
  });

  describe('withLiveRows and scopeReadWhere', () => {
    it('pass the where through unchanged, since every row is live', () => {
      const where = { quantity: 1 };

      expect(withLiveRows(ID_HARD_DELETE_MODEL_CONVENTION, where)).toBe(where);
      expect(scopeReadWhere(ID_HARD_DELETE_MODEL_CONVENTION, where)).toBe(
        where,
      );
    });
  });

  describe('findById', () => {
    it('pins where to the id with no deleted-row filter', async () => {
      const record = testHardDeleteRecordFactory.build();

      harness.typeorm.findOne.mockResolvedValue(record);

      await expect(harness.repository.findById(record.id)).resolves.toBe(
        record,
      );
      expect(harness.typeorm.findOne).toHaveBeenCalledWith({
        where: { id: record.id },
      });
    });

    it('throws NotFound when no row matches', async () => {
      harness.typeorm.findOne.mockResolvedValue(null);

      await expect(harness.repository.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne and findBy', () => {
    it('pass options through untouched', async () => {
      const options = { where: [{ quantity: 1 }, { note: 'x' }] };

      harness.typeorm.findOne.mockResolvedValue(null);
      harness.typeorm.find.mockResolvedValue([]);

      await harness.repository.findOne(options);
      await harness.repository.findBy(options);
      await harness.repository.findBy();

      expect(harness.typeorm.findOne).toHaveBeenCalledWith(options);
      expect(harness.typeorm.find).toHaveBeenNthCalledWith(1, options);
      expect(harness.typeorm.find).toHaveBeenNthCalledWith(2, undefined);
    });
  });

  describe('findByPaginated', () => {
    it('orders by id and adds no deleted-row filter', async () => {
      harness.typeorm.findAndCount.mockResolvedValue([[], 0]);

      await harness.repository.findByPaginated({ where: { quantity: 5 } });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith({
        order: { id: 'ASC' },
        skip: 0,
        take: POSTGRES_DEFAULT_PAGE_SIZE,
        where: { quantity: 5 },
      });
    });
  });

  describe('remove', () => {
    it('deletes the row for real and returns what it held', async () => {
      const record = testHardDeleteRecordFactory.build();

      harness.builder.execute.mockResolvedValue({
        affected: 1,
        raw: [{ id: record.id, note: record.note }],
      });

      await expect(harness.repository.remove(record.id)).resolves.toEqual({
        id: record.id,
        note: record.note,
      });
      expect(harness.builder.delete).toHaveBeenCalled();
      expect(harness.builder.softDelete).not.toHaveBeenCalled();
      expect(harness.builder.update).not.toHaveBeenCalled();
      expect(harness.builder.where).toHaveBeenCalledWith({ id: record.id });
      expect(harness.builder.returning).toHaveBeenCalledWith('*');
    });

    it('throws NotFound for a missing row', async () => {
      harness.builder.execute.mockResolvedValue({ affected: 0, raw: [] });

      await expect(harness.repository.remove('gone')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeMany', () => {
    it('deletes the matching rows for real and returns the count', async () => {
      harness.typeorm.delete.mockResolvedValue({ affected: 3, raw: [] });

      await expect(
        harness.repository.removeMany({ quantity: 1 }),
      ).resolves.toEqual({ removedCount: 3 });
      expect(harness.typeorm.delete).toHaveBeenCalledWith({ quantity: 1 });
      expect(harness.typeorm.softDelete).not.toHaveBeenCalled();
      expect(harness.typeorm.update).not.toHaveBeenCalled();
    });

    it('returns 0 when the driver reports a null affected count', async () => {
      harness.typeorm.delete.mockResolvedValue({ affected: null, raw: [] });

      await expect(
        harness.repository.removeMany({ quantity: 1 }),
      ).resolves.toEqual({ removedCount: 0 });
    });

    it('rejects an empty where without touching the database', async () => {
      await expect(harness.repository.removeMany({})).rejects.toThrow(
        BadRequestException,
      );
      expect(harness.typeorm.delete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('loads the row by id, applies the input and saves', async () => {
      const record = testHardDeleteRecordFactory.build();
      const input = testHardDeleteRecordInputFactory.build();

      harness.typeorm.findOne.mockResolvedValue(record);

      await expect(
        harness.repository.update(record.id, input),
      ).resolves.toMatchObject({ id: record.id, ...input });
      expect(harness.typeorm.findOne).toHaveBeenCalledWith({
        where: { id: record.id },
      });
    });
  });

  describe('updateMany', () => {
    it('updates the matching rows with no deleted-row filter', async () => {
      harness.typeorm.update.mockResolvedValue({ affected: 2 });

      await expect(
        harness.repository.updateMany({ quantity: 1 }, { note: 'x' }),
      ).resolves.toEqual({ updateCount: 2 });
      expect(harness.typeorm.update).toHaveBeenCalledWith(
        { quantity: 1 },
        { note: 'x' },
      );
    });
  });

  describe('updateManyReturning', () => {
    it('selects ids, updates by them and reloads', async () => {
      const matches = testHardDeleteRecordFactory.buildList(2);
      const reloaded = matches.map((match) => {
        return { ...match, note: 'x' };
      });

      harness.typeorm.find
        .mockResolvedValueOnce(matches)
        .mockResolvedValueOnce(reloaded);
      harness.typeorm.update.mockResolvedValue({ affected: 2 });

      await expect(
        harness.repository.updateManyReturning({ quantity: 1 }, { note: 'x' }),
      ).resolves.toEqual({ data: reloaded, updateCount: 2 });

      const idWhere = { id: In(matches.map((match) => match.id)) };

      expect(harness.typeorm.find).toHaveBeenNthCalledWith(1, {
        select: { id: true },
        take: POSTGRES_MAX_RETURNING_ROWS + 1,
        where: { quantity: 1 },
      });
      expect(harness.typeorm.find).toHaveBeenLastCalledWith({ where: idWhere });
    });
  });
});
