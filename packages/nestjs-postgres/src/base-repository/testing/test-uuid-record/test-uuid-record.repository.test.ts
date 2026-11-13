import 'reflect-metadata';

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { asMock } from '@openthrottle/nestjs-testing';
import type { EntityMetadata, Repository } from 'typeorm';
import { FindOperator, In } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseModel } from '../../../base-model/base-model.entity.ts';
import {
  ID_TIMESTAMP_MODEL_CONVENTION,
  UUID_FLAG_MODEL_CONVENTION,
} from '../../../model-convention/model-convention.constants.ts';
import {
  POSTGRES_DEFAULT_PAGE_SIZE,
  POSTGRES_MAX_RETURNING_ROWS,
} from '../../base-repository.constants.ts';
import {
  resolveModelConvention,
  withLiveRows,
} from '../../base-repository.utils.ts';
import { TestUuidRecord } from './test-uuid-record.entity.ts';
import {
  testUuidRecordFactory,
  testUuidRecordInputFactory,
} from './test-uuid-record.factory.ts';
import { TestUuidRecordRepository } from './test-uuid-record.repository.ts';

const isLiveFlagOperator = (value: unknown): boolean => {
  return (
    value instanceof FindOperator &&
    value.type === 'raw' &&
    value.getSql?.('is_deleted') === 'is_deleted IS NOT TRUE'
  );
};

/** Matches the `is_deleted IS NOT TRUE` operator wherever it appears in a call. */
const LIVE_FLAG = {
  asymmetricMatch: isLiveFlagOperator,
  toAsymmetricMatcher: () => {
    return 'LiveFlag<is_deleted IS NOT TRUE>';
  },
};

const buildHarness = () => {
  const execute = vi.fn();
  const builder = {
    execute,
    returning: vi.fn(),
    set: vi.fn(),
    softDelete: vi.fn(),
    update: vi.fn(),
    where: vi.fn(),
  };

  builder.returning.mockReturnValue(builder);
  builder.set.mockReturnValue(builder);
  builder.softDelete.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);

  const typeorm = {
    create: vi.fn((input: unknown) => input),
    createQueryBuilder: vi.fn(() => builder),
    find: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn(),
    manager: {
      connection: {
        driver: { prepareHydratedValue: vi.fn((value: unknown) => value) },
      },
    },
    metadata: {
      columns: asMock<EntityMetadata['columns']>([
        { databaseName: 'uuid', propertyName: 'uuid' },
        { databaseName: 'is_deleted', propertyName: 'isDeleted' },
      ]),
    },
    save: vi.fn(async (entity: unknown) => entity),
    softDelete: vi.fn(),
    target: TestUuidRecord,
    update: vi.fn(),
  };
  const repository = new TestUuidRecordRepository(
    asMock<Repository<TestUuidRecord>>(typeorm),
  );

  return { builder, repository, typeorm };
};

describe('BaseRepository (uuid key + is_deleted flag)', () => {
  let harness: ReturnType<typeof buildHarness>;

  beforeEach(() => {
    harness = buildHarness();
  });

  describe('resolveModelConvention', () => {
    it('reads each base class convention', () => {
      expect(resolveModelConvention(TestUuidRecord)).toBe(
        UUID_FLAG_MODEL_CONVENTION,
      );
      expect(resolveModelConvention(BaseModel)).toBe(
        ID_TIMESTAMP_MODEL_CONVENTION,
      );
    });

    it.each([
      ['a string target', 'test_uuid_records'],
      ['a class without a base', class Plain {}],
    ])('throws for %s', (_name, target) => {
      expect(() => {
        return resolveModelConvention(target);
      }).toThrow(/BaseModel or BaseUuidModel/);
    });
  });

  describe('withLiveRows', () => {
    it('treats NULL is_deleted as live with IS NOT TRUE', () => {
      const where = withLiveRows(UUID_FLAG_MODEL_CONVENTION, { quantity: 1 });

      expect(where).toEqual({ isDeleted: LIVE_FLAG, quantity: 1 });
    });
  });

  describe('findById', () => {
    it('pins where to the uuid and to live rows', async () => {
      const record = testUuidRecordFactory.build();

      harness.typeorm.findOne.mockResolvedValue(record);

      await expect(harness.repository.findById(record.uuid)).resolves.toBe(
        record,
      );
      expect(harness.typeorm.findOne).toHaveBeenCalledWith({
        where: { isDeleted: LIVE_FLAG, uuid: record.uuid },
      });
    });

    it('throws NotFound when no live row matches', async () => {
      harness.typeorm.findOne.mockResolvedValue(null);

      await expect(harness.repository.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('adds the live-rows filter to the caller where', async () => {
      harness.typeorm.findOne.mockResolvedValue(null);

      await harness.repository.findOne({ where: { quantity: 1 } });

      expect(harness.typeorm.findOne).toHaveBeenCalledWith({
        where: { isDeleted: LIVE_FLAG, quantity: 1 },
      });
    });

    it('passes options through untouched when withDeleted is set', async () => {
      const options = { where: { quantity: 1 }, withDeleted: true };

      await harness.repository.findOne(options);

      expect(harness.typeorm.findOne).toHaveBeenCalledWith(options);
    });
  });

  describe('findBy', () => {
    it('filters to live rows when no options are given', async () => {
      harness.typeorm.find.mockResolvedValue([]);

      await harness.repository.findBy();

      expect(harness.typeorm.find).toHaveBeenCalledWith({
        where: { isDeleted: LIVE_FLAG },
      });
    });

    it('filters every branch of an array where', async () => {
      harness.typeorm.find.mockResolvedValue([]);

      await harness.repository.findBy({
        where: [{ quantity: 1 }, { note: 'x' }],
      });

      expect(harness.typeorm.find).toHaveBeenCalledWith({
        where: [
          { isDeleted: LIVE_FLAG, quantity: 1 },
          { isDeleted: LIVE_FLAG, note: 'x' },
        ],
      });
    });
  });

  describe('findByPaginated', () => {
    beforeEach(() => {
      harness.typeorm.findAndCount.mockResolvedValue([[], 0]);
    });

    it('orders by created_at then uuid and filters to live rows', async () => {
      await harness.repository.findByPaginated({ where: { quantity: 5 } });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith({
        order: { createdAt: 'ASC', uuid: 'ASC' },
        skip: 0,
        take: POSTGRES_DEFAULT_PAGE_SIZE,
        where: { isDeleted: LIVE_FLAG, quantity: 5 },
      });
    });

    it('keeps the given order', async () => {
      await harness.repository.findByPaginated({ order: { quantity: 'DESC' } });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { quantity: 'DESC' } }),
      );
    });
  });

  describe('remove', () => {
    it('flips is_deleted on a live row and returns it', async () => {
      const record = testUuidRecordFactory.build();

      harness.builder.execute.mockResolvedValue({
        affected: 1,
        raw: [{ is_deleted: true, uuid: record.uuid }],
      });

      await expect(harness.repository.remove(record.uuid)).resolves.toEqual({
        isDeleted: true,
        uuid: record.uuid,
      });
      expect(harness.builder.softDelete).not.toHaveBeenCalled();
      expect(harness.builder.set).toHaveBeenCalledWith({ isDeleted: true });
      expect(harness.builder.where).toHaveBeenCalledWith({
        isDeleted: LIVE_FLAG,
        uuid: record.uuid,
      });
      expect(harness.builder.returning).toHaveBeenCalledWith('*');
    });

    it('throws NotFound for a missing or already deleted row', async () => {
      harness.builder.execute.mockResolvedValue({ affected: 0, raw: [] });

      await expect(harness.repository.remove('gone')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeMany', () => {
    it('flips is_deleted on live rows and returns the count', async () => {
      harness.typeorm.update.mockResolvedValue({ affected: 3 });

      await expect(
        harness.repository.removeMany({ quantity: 1 }),
      ).resolves.toEqual({ removedCount: 3 });
      expect(harness.typeorm.softDelete).not.toHaveBeenCalled();
      expect(harness.typeorm.update).toHaveBeenCalledWith(
        { isDeleted: LIVE_FLAG, quantity: 1 },
        { isDeleted: true },
      );
    });

    it('returns 0 when the driver reports no affected count', async () => {
      harness.typeorm.update.mockResolvedValue({ affected: undefined });

      await expect(
        harness.repository.removeMany({ quantity: 1 }),
      ).resolves.toEqual({ removedCount: 0 });
    });

    it('rejects an empty where without touching the database', async () => {
      await expect(harness.repository.removeMany({})).rejects.toThrow(
        BadRequestException,
      );
      expect(harness.typeorm.update).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('loads the live row by uuid, applies the input and saves', async () => {
      const record = testUuidRecordFactory.build();
      const input = testUuidRecordInputFactory.build();

      harness.typeorm.findOne.mockResolvedValue(record);

      await expect(
        harness.repository.update(record.uuid, input),
      ).resolves.toMatchObject({ uuid: record.uuid, ...input });
      expect(harness.typeorm.findOne).toHaveBeenCalledWith({
        where: { isDeleted: LIVE_FLAG, uuid: record.uuid },
      });
    });

    it('throws NotFound when the row is missing or deleted', async () => {
      harness.typeorm.findOne.mockResolvedValue(null);

      await expect(
        harness.repository.update('missing', { note: 'x' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMany', () => {
    it('restricts the update to live rows', async () => {
      harness.typeorm.update.mockResolvedValue({ affected: 2 });

      await expect(
        harness.repository.updateMany({ quantity: 1 }, { note: 'x' }),
      ).resolves.toEqual({ updateCount: 2 });
      expect(harness.typeorm.update).toHaveBeenCalledWith(
        { isDeleted: LIVE_FLAG, quantity: 1 },
        { note: 'x' },
      );
    });
  });

  describe('updateManyReturning', () => {
    it('selects uuids, updates by them and reloads live rows', async () => {
      const matches = testUuidRecordFactory.buildList(2);
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

      const uuidWhere = { uuid: In(matches.map((match) => match.uuid)) };

      expect(harness.typeorm.find).toHaveBeenNthCalledWith(1, {
        select: ['uuid'],
        take: POSTGRES_MAX_RETURNING_ROWS + 1,
        where: { isDeleted: LIVE_FLAG, quantity: 1 },
      });
      expect(harness.typeorm.update).toHaveBeenCalledWith(uuidWhere, {
        note: 'x',
      });
      expect(harness.typeorm.find).toHaveBeenLastCalledWith({
        where: { ...uuidWhere, isDeleted: LIVE_FLAG },
      });
    });
  });
});
