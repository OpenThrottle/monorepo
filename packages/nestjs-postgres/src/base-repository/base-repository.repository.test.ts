import 'reflect-metadata';

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { asMock } from '@openthrottle/nestjs-testing';
import type { EntityMetadata, Repository } from 'typeorm';
import { In, IsNull } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetPostgresProfilingDedupe } from '../postgres-profiling/explain-dedupe/explain-dedupe.utils.ts';
import { USERS_INDEX_SCAN_EXPLAIN_RESULT } from '../postgres-profiling/explain-plan/explain-outputs.factory.ts';
import { flushPostgresProfiling } from '../postgres-profiling/explain-tracking/explain-tracking.utils.ts';
import { POSTGRES_PROFILING_LOGGER } from '../postgres-profiling/postgres-profiling.constants.ts';
import { captureQuery } from '../postgres-profiling/query-capture/query-capture.utils.ts';
import { resetPostgresProfilingStartupLog } from '../postgres-profiling/startup-log/startup-log.utils.ts';
import {
  POSTGRES_DEFAULT_PAGE_SIZE,
  POSTGRES_MAX_BIND_PARAMS,
  POSTGRES_MAX_INSERT_ROWS,
  POSTGRES_MAX_PAGE_SIZE,
  POSTGRES_MAX_RETURNING_ROWS,
} from './base-repository.constants.ts';
import { TestRecord } from './testing/test-record/test-record.entity.ts';
import {
  testRecordFactory,
  testRecordInputFactory,
} from './testing/test-record/test-record.factory.ts';
import { TestRecordRepository } from './testing/test-record/test-record.repository.ts';

const PROFILING_ENV_NAMES = [
  'POSTGRES_PROFILING_ANALYZE',
  'POSTGRES_PROFILING_DEDUPE_SECONDS',
  'POSTGRES_PROFILING_MIN_DURATION_MS',
  'POSTGRES_PROFILING_MODE',
  'POSTGRES_PROFILING_OUTPUT_DIR',
  'POSTGRES_PROFILING_TARGETS',
] as const;

const buildColumns = (count: number): EntityMetadata['columns'] => {
  const columns = Array.from({ length: count }, (_, index) => {
    return { databaseName: `column_${index}`, propertyName: `column${index}` };
  });

  return asMock<EntityMetadata['columns']>(columns);
};

const buildHarness = () => {
  const execute = vi.fn();
  const builder = {
    execute,
    returning: vi.fn(),
    softDelete: vi.fn(),
    where: vi.fn(),
  };

  builder.returning.mockReturnValue(builder);
  builder.softDelete.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);

  const manager = {
    connection: {
      driver: { prepareHydratedValue: vi.fn((value: unknown) => value) },
    },
    insert: vi.fn(),
    query: vi.fn(),
    transaction: vi.fn(),
  };

  manager.transaction.mockImplementation(
    async (callback: (inner: unknown) => Promise<unknown>) => {
      return callback(manager);
    },
  );

  const typeorm = {
    create: vi.fn((input: unknown) => input),
    createQueryBuilder: vi.fn(() => builder),
    find: vi.fn(),
    findAndCount: vi.fn(),
    findOne: vi.fn(),
    manager,
    metadata: { columns: buildColumns(3) },
    save: vi.fn(async (entity: unknown) => entity),
    softDelete: vi.fn(),
    target: TestRecord,
    update: vi.fn(),
  };
  const repository = new TestRecordRepository(
    asMock<Repository<TestRecord>>(typeorm),
  );

  return { builder, manager, repository, typeorm };
};

const buildInputs = (count: number) => {
  return testRecordInputFactory.buildList(count);
};

const insertedRowCounts = (insert: ReturnType<typeof vi.fn>): number[] => {
  return insert.mock.calls.map(([, rows]) => {
    return Array.isArray(rows) ? rows.length : -1;
  });
};

describe('BaseRepository', () => {
  let harness: ReturnType<typeof buildHarness>;

  beforeEach(() => {
    harness = buildHarness();
  });

  describe('create', () => {
    it('saves the mapped input and returns the saved entity', async () => {
      const input = testRecordInputFactory.build();
      const saved = testRecordFactory.build(input);

      harness.typeorm.save.mockResolvedValue(saved);

      await expect(harness.repository.create(input)).resolves.toBe(saved);
      expect(harness.typeorm.create).toHaveBeenCalledWith(input);
      expect(harness.typeorm.save).toHaveBeenCalledWith(input, undefined);
    });

    it('passes save options through', async () => {
      const input = testRecordInputFactory.build();

      await harness.repository.create(input, { reload: false });

      expect(harness.typeorm.save).toHaveBeenCalledWith(input, {
        reload: false,
      });
    });

    it('rejects when the database rejects', async () => {
      const error = new Error('insert failed');

      harness.typeorm.save.mockRejectedValue(error);

      await expect(
        harness.repository.create(testRecordInputFactory.build()),
      ).rejects.toBe(error);
    });
  });

  describe('createMany', () => {
    describe('when the input is empty', () => {
      it('returns an empty list without touching the database', async () => {
        await expect(harness.repository.createMany([])).resolves.toEqual([]);

        expect(harness.manager.transaction).not.toHaveBeenCalled();
        expect(harness.manager.insert).not.toHaveBeenCalled();
      });
    });

    describe('when the rows fit in one chunk', () => {
      it('inserts them in one transaction and returns the entities', async () => {
        const inputs = buildInputs(3);

        const created = await harness.repository.createMany(inputs);

        expect(created).toEqual(inputs);
        expect(harness.manager.transaction).toHaveBeenCalledTimes(1);
        expect(harness.manager.insert).toHaveBeenCalledTimes(1);
        expect(harness.manager.insert).toHaveBeenCalledWith(TestRecord, inputs);
      });
    });

    describe('when the table is wide', () => {
      it('splits into chunks that stay under the bind-parameter limit', async () => {
        const columnCount = 100;
        const perChunk = Math.floor(POSTGRES_MAX_BIND_PARAMS / columnCount);

        harness.typeorm.metadata.columns = buildColumns(columnCount);

        await harness.repository.createMany(buildInputs(perChunk * 2 + 5));

        expect(insertedRowCounts(harness.manager.insert)).toEqual([
          perChunk,
          perChunk,
          5,
        ]);
        expect(harness.manager.transaction).toHaveBeenCalledTimes(1);
      });

      it('still inserts one row per statement when a row alone exceeds the limit', async () => {
        harness.typeorm.metadata.columns = buildColumns(
          POSTGRES_MAX_BIND_PARAMS + 1,
        );

        await harness.repository.createMany(buildInputs(2));

        expect(insertedRowCounts(harness.manager.insert)).toEqual([1, 1]);
      });
    });

    describe('when the table is narrow', () => {
      it('caps each chunk at the maximum insert rows', async () => {
        await harness.repository.createMany(
          buildInputs(POSTGRES_MAX_INSERT_ROWS * 2 + 7),
        );

        expect(insertedRowCounts(harness.manager.insert)).toEqual([
          POSTGRES_MAX_INSERT_ROWS,
          POSTGRES_MAX_INSERT_ROWS,
          7,
        ]);
      });
    });

    describe('when an insert fails', () => {
      it('rejects with the insert error', async () => {
        const error = new Error('insert failed');

        harness.manager.insert.mockRejectedValue(error);

        await expect(
          harness.repository.createMany(buildInputs(2)),
        ).rejects.toBe(error);
      });
    });
  });

  describe('findById', () => {
    it('pins where to the id and passes the other options through', async () => {
      const record = testRecordFactory.build();

      harness.typeorm.findOne.mockResolvedValue(record);

      await expect(
        harness.repository.findById(record.id, { relations: [] }),
      ).resolves.toBe(record);
      expect(harness.typeorm.findOne).toHaveBeenCalledWith({
        relations: [],
        where: { id: record.id },
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
    it('passes options through and returns null when nothing matches', async () => {
      harness.typeorm.findOne.mockResolvedValue(null);
      const options = { where: { quantity: 1 } };

      await expect(harness.repository.findOne(options)).resolves.toBeNull();
      expect(harness.typeorm.findOne).toHaveBeenCalledWith(options);
    });
  });

  describe('findBy', () => {
    it('passes the options through to find', async () => {
      const records = testRecordFactory.buildList(2);
      const options = { where: { quantity: 2 } };

      harness.typeorm.find.mockResolvedValue(records);

      await expect(harness.repository.findBy(options)).resolves.toBe(records);
      expect(harness.typeorm.find).toHaveBeenCalledWith(options);
    });

    it('calls find with no options when none are given', async () => {
      harness.typeorm.find.mockResolvedValue([]);

      await harness.repository.findBy();

      expect(harness.typeorm.find).toHaveBeenCalledWith(undefined);
    });
  });

  describe('findByPaginated', () => {
    const records = testRecordFactory.buildList(3);

    beforeEach(() => {
      harness.typeorm.findAndCount.mockResolvedValue([records, 3]);
    });

    it('applies default take, skip and id order', async () => {
      const page = await harness.repository.findByPaginated();

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith({
        order: { id: 'ASC' },
        skip: 0,
        take: POSTGRES_DEFAULT_PAGE_SIZE,
      });
      expect(page).toEqual({
        data: records,
        pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 3 },
      });
    });

    it('uses the given take and skip and computes pageInfo from them', async () => {
      harness.typeorm.findAndCount.mockResolvedValue([records, 30]);

      const page = await harness.repository.findByPaginated({
        skip: 20,
        take: 10,
      });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(page.pageInfo).toEqual({
        currentPage: 3,
        hasNextPage: true,
        totalCount: 30,
      });
    });

    it('reports a next page when more rows remain', async () => {
      harness.typeorm.findAndCount.mockResolvedValue([records, 100]);

      const page = await harness.repository.findByPaginated({ take: 3 });

      expect(page.pageInfo.hasNextPage).toBe(true);
    });

    it('uses the given order', async () => {
      await harness.repository.findByPaginated({ order: { quantity: 'DESC' } });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { quantity: 'DESC' } }),
      );
    });

    it('keeps the default order when order is explicitly undefined', async () => {
      await harness.repository.findByPaginated({ order: undefined });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { id: 'ASC' } }),
      );
    });

    it('passes other options through', async () => {
      await harness.repository.findByPaginated({
        where: { quantity: 5 },
        withDeleted: true,
      });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { quantity: 5 }, withDeleted: true }),
      );
    });

    it.each([0, -5])('clamps take %i up to 1', async (take) => {
      harness.typeorm.findAndCount.mockResolvedValue([records.slice(0, 1), 5]);

      const page = await harness.repository.findByPaginated({ skip: 3, take });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
      expect(page.pageInfo.currentPage).toBe(4);
    });

    it('clamps take above the maximum and computes pageInfo from the clamped take', async () => {
      harness.typeorm.findAndCount.mockResolvedValue([records, 1_000]);

      const page = await harness.repository.findByPaginated({
        skip: POSTGRES_MAX_PAGE_SIZE,
        take: POSTGRES_MAX_PAGE_SIZE * 5,
      });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: POSTGRES_MAX_PAGE_SIZE }),
      );
      expect(page.pageInfo.currentPage).toBe(2);
    });

    it('floors a negative skip at 0', async () => {
      await harness.repository.findByPaginated({ skip: -10 });

      expect(harness.typeorm.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });

    it('returns an empty page', async () => {
      harness.typeorm.findAndCount.mockResolvedValue([[], 0]);

      await expect(harness.repository.findByPaginated()).resolves.toEqual({
        data: [],
        pageInfo: { currentPage: 1, hasNextPage: false, totalCount: 0 },
      });
    });
  });

  describe('remove', () => {
    const buildRawRow = (record: TestRecord): Record<string, unknown> => {
      return { id: record.id, note: record.note };
    };

    beforeEach(() => {
      harness.typeorm.metadata.columns = asMock<EntityMetadata['columns']>([
        { databaseName: 'id', propertyName: 'id' },
        { databaseName: 'note', propertyName: 'note' },
      ]);
    });

    it('soft deletes live rows only and returns the removed entity', async () => {
      const record = testRecordFactory.build();

      harness.builder.execute.mockResolvedValue({
        affected: 1,
        raw: [buildRawRow(record)],
      });

      await expect(harness.repository.remove(record.id)).resolves.toEqual({
        id: record.id,
        note: record.note,
      });
      expect(harness.builder.where).toHaveBeenCalledWith({
        deletedAt: IsNull(),
        id: record.id,
      });
      expect(harness.builder.returning).toHaveBeenCalledWith('*');
      expect(
        harness.manager.connection.driver.prepareHydratedValue,
      ).toHaveBeenCalled();
    });

    it.each([
      ['affected is 0', { affected: 0, raw: [] }],
      ['affected is undefined', { affected: undefined, raw: [] }],
      ['no row is returned', { affected: 1, raw: [] }],
      ['raw is not a list', { affected: 1, raw: undefined }],
    ])('throws NotFound when %s', async (_name, result) => {
      harness.builder.execute.mockResolvedValue(result);

      await expect(harness.repository.remove('gone')).rejects.toThrow(
        NotFoundException,
      );
      expect(harness.typeorm.create).not.toHaveBeenCalled();
    });

    it('throws NotFound for an already deleted row', async () => {
      harness.builder.execute.mockResolvedValue({ affected: 0, raw: [] });

      await expect(harness.repository.remove('deleted')).rejects.toThrow(
        NotFoundException,
      );
      expect(harness.builder.where).toHaveBeenCalledWith(
        expect.objectContaining({ deletedAt: IsNull() }),
      );
    });
  });

  describe('removeMany', () => {
    it('restricts the delete to live rows and returns the count', async () => {
      harness.typeorm.softDelete.mockResolvedValue({ affected: 4 });

      await expect(
        harness.repository.removeMany({ quantity: 1 }),
      ).resolves.toEqual({ removedCount: 4 });
      expect(harness.typeorm.softDelete).toHaveBeenCalledWith({
        deletedAt: IsNull(),
        quantity: 1,
      });
    });

    it('returns 0 when nothing matched', async () => {
      harness.typeorm.softDelete.mockResolvedValue({ affected: 0 });

      await expect(
        harness.repository.removeMany({ quantity: 1 }),
      ).resolves.toEqual({ removedCount: 0 });
    });

    it('returns 0 when the driver reports no affected count', async () => {
      harness.typeorm.softDelete.mockResolvedValue({ affected: undefined });

      await expect(
        harness.repository.removeMany({ quantity: 1 }),
      ).resolves.toEqual({ removedCount: 0 });
    });

    it('rejects an empty where without touching the database', async () => {
      await expect(harness.repository.removeMany({})).rejects.toThrow(
        BadRequestException,
      );
      expect(harness.typeorm.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFound when the row is missing or deleted', async () => {
      harness.typeorm.findOne.mockResolvedValue(null);

      await expect(
        harness.repository.update('missing', { note: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(harness.typeorm.save).not.toHaveBeenCalled();
    });

    it('applies a full update and saves the entity', async () => {
      const record = testRecordFactory.build();
      const input = testRecordInputFactory.build();

      harness.typeorm.findOne.mockResolvedValue(record);

      const updated = await harness.repository.update(record.id, input);

      expect(harness.typeorm.findOne).toHaveBeenCalledWith({
        where: { id: record.id },
      });
      expect(updated).toMatchObject({ id: record.id, ...input });
      expect(harness.typeorm.save).toHaveBeenCalledWith(record);
    });

    it('applies a partial update and keeps the other columns', async () => {
      const record = testRecordFactory.build();
      const { ownerId, quantity } = record;

      harness.typeorm.findOne.mockResolvedValue(record);

      const updated = await harness.repository.update(record.id, {
        note: 'changed',
      });

      expect(updated).toMatchObject({ note: 'changed', ownerId, quantity });
    });
  });

  describe('updateMany', () => {
    it('restricts the update to live rows and returns the count', async () => {
      harness.typeorm.update.mockResolvedValue({ affected: 2 });

      await expect(
        harness.repository.updateMany({ quantity: 1 }, { note: 'x' }),
      ).resolves.toEqual({ updateCount: 2 });
      expect(harness.typeorm.update).toHaveBeenCalledWith(
        { deletedAt: IsNull(), quantity: 1 },
        { note: 'x' },
      );
    });

    it('returns 0 when the driver reports no affected count', async () => {
      harness.typeorm.update.mockResolvedValue({ affected: undefined });

      await expect(
        harness.repository.updateMany({ quantity: 1 }, { note: 'x' }),
      ).resolves.toEqual({ updateCount: 0 });
    });

    it('rejects an empty where without touching the database', async () => {
      await expect(
        harness.repository.updateMany({}, { note: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(harness.typeorm.update).not.toHaveBeenCalled();
    });
  });

  describe('updateManyReturning', () => {
    it('rejects an empty where without touching the database', async () => {
      await expect(
        harness.repository.updateManyReturning({}, { note: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(harness.typeorm.find).not.toHaveBeenCalled();
    });

    it('rejects when more rows match than the limit allows', async () => {
      harness.typeorm.find.mockResolvedValue(
        testRecordFactory.buildList(POSTGRES_MAX_RETURNING_ROWS + 1),
      );

      await expect(
        harness.repository.updateManyReturning({ quantity: 1 }, { note: 'x' }),
      ).rejects.toThrow(BadRequestException);
      expect(harness.typeorm.find).toHaveBeenCalledWith({
        select: ['id'],
        take: POSTGRES_MAX_RETURNING_ROWS + 1,
        where: { deletedAt: IsNull(), quantity: 1 },
      });
      expect(harness.typeorm.update).not.toHaveBeenCalled();
    });

    it('returns an empty result without updating when nothing matches', async () => {
      harness.typeorm.find.mockResolvedValue([]);

      await expect(
        harness.repository.updateManyReturning({ quantity: 1 }, { note: 'x' }),
      ).resolves.toEqual({ data: [], updateCount: 0 });
      expect(harness.typeorm.update).not.toHaveBeenCalled();
    });

    describe('when rows match', () => {
      const matches = testRecordFactory.buildList(2);
      const reloaded = matches.map((match) => {
        return { ...match, note: 'x' };
      });

      beforeEach(() => {
        harness.typeorm.find
          .mockResolvedValueOnce(matches)
          .mockResolvedValueOnce(reloaded);
      });

      it('updates by the matched ids and reloads them', async () => {
        harness.typeorm.update.mockResolvedValue({ affected: 2 });

        await expect(
          harness.repository.updateManyReturning(
            { quantity: 1 },
            { note: 'x' },
          ),
        ).resolves.toEqual({ data: reloaded, updateCount: 2 });

        const idWhere = { id: In(matches.map((match) => match.id)) };

        expect(harness.typeorm.update).toHaveBeenCalledWith(idWhere, {
          note: 'x',
        });
        expect(harness.typeorm.find).toHaveBeenLastCalledWith({
          where: idWhere,
        });
      });

      it('falls back to the reloaded row count when no affected count is reported', async () => {
        harness.typeorm.update.mockResolvedValue({ affected: undefined });

        await expect(
          harness.repository.updateManyReturning(
            { quantity: 1 },
            { note: 'x' },
          ),
        ).resolves.toMatchObject({ updateCount: reloaded.length });
      });
    });
  });

  describe('with POSTGRES_PROFILING on', () => {
    const SAVE_SQL = 'INSERT INTO test_records (quantity) VALUES ($1)';

    beforeEach(() => {
      vi.spyOn(POSTGRES_PROFILING_LOGGER, 'info').mockImplementation(
        () => undefined,
      );
      vi.spyOn(POSTGRES_PROFILING_LOGGER, 'warn').mockImplementation(
        () => undefined,
      );
      vi.spyOn(POSTGRES_PROFILING_LOGGER, 'debug').mockImplementation(
        () => undefined,
      );

      for (const name of PROFILING_ENV_NAMES) {
        vi.stubEnv(name, undefined);
      }

      vi.stubEnv('POSTGRES_PROFILING', 'true');
      resetPostgresProfilingDedupe();
      resetPostgresProfilingStartupLog();
      harness.manager.query.mockResolvedValue(USERS_INDEX_SCAN_EXPLAIN_RESULT);
    });

    afterEach(async () => {
      await flushPostgresProfiling();
      vi.unstubAllEnvs();
      resetPostgresProfilingDedupe();
      resetPostgresProfilingStartupLog();
      vi.restoreAllMocks();
    });

    it('explains the captured query on the repository manager and leaves the result alone', async () => {
      const input = testRecordInputFactory.build();
      const saved = testRecordFactory.build(input);

      harness.typeorm.save.mockImplementation(async () => {
        captureQuery({ parameters: [input.quantity], query: SAVE_SQL });

        return saved;
      });

      await expect(harness.repository.create(input)).resolves.toBe(saved);
      await flushPostgresProfiling();

      expect(harness.manager.query).toHaveBeenCalledTimes(1);
      expect(harness.manager.query).toHaveBeenCalledWith(
        `EXPLAIN (FORMAT JSON, SUMMARY) ${SAVE_SQL}`,
        [input.quantity],
      );
    });

    it('rethrows the method error and still explains what ran', async () => {
      const error = new Error('insert failed');

      harness.typeorm.save.mockImplementation(async () => {
        captureQuery({ query: SAVE_SQL });

        throw error;
      });

      await expect(
        harness.repository.create(testRecordInputFactory.build()),
      ).rejects.toBe(error);
      await flushPostgresProfiling();

      expect(harness.manager.query).toHaveBeenCalledTimes(1);
    });
  });
});
