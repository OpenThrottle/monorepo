import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  type DeepPartial,
  type FindManyOptions,
  type FindOneOptions,
  type FindOptionsWhere,
  In,
  type Repository,
} from 'typeorm';

import type { BaseModel } from '../base-model/base-model.entity.ts';
import type { UpdateModelInput } from '../base-model/base-model.types.ts';
import { PostgresProfiling } from '../postgres-profiling/postgres-profiling.decorator.ts';
import {
  POSTGRES_DEFAULT_PAGE_SIZE,
  POSTGRES_MAX_BIND_PARAMS,
  POSTGRES_MAX_INSERT_ROWS,
  POSTGRES_MAX_PAGE_SIZE,
  POSTGRES_MAX_RETURNING_ROWS,
} from './base-repository.constants.ts';
import type {
  FindByPaginatedResults,
  RemoveManyResults,
  UpdateManyResults,
} from './base-repository.types.ts';
import {
  buildDefaultOrder,
  buildIdWhere,
  buildWhereWithIds,
  isRawRow,
  mapRawRowToEntityInput,
  toInsertRows,
  toUpdateValues,
  withLiveRows,
} from './base-repository.utils.ts';

/**
 * @public
 * @description Typed CRUD over a `BaseModel` table: soft deletes, bounded reads, and bulk
 * writes that respect Postgres statement limits. Extend it per entity, declare `tableName`
 * (used in error messages) and, when the create input differs from the entity shape,
 * override `toEntityInput`. Methods throw NestJS HTTP exceptions on purpose, since they are
 * called from request handlers.
 */
export abstract class BaseRepository<
  TEntity extends BaseModel,
  TCreateInput extends DeepPartial<TEntity>,
  TUpdateInput extends object = UpdateModelInput<TEntity>,
> {
  protected abstract readonly tableName: string;

  constructor(protected readonly repository: Repository<TEntity>) {}

  /**
   * @description Maps a create input to the entity shape TypeORM persists. Identity by
   * default; override to translate e.g. `accountId` into `account: { id }`.
   */
  protected toEntityInput(input: TCreateInput): DeepPartial<TEntity> {
    return input;
  }

  /**
   * @description Inserts one row and returns the saved entity.
   */
  @PostgresProfiling()
  async create(
    input: TCreateInput,
    options?: Parameters<Repository<TEntity>['save']>[1],
  ): Promise<TEntity> {
    const entity = this.repository.create(this.toEntityInput(input));

    return this.repository.save(entity, options);
  }

  /**
   * @description Inserts many rows in one transaction, in ordered chunks sized to stay under
   * both `POSTGRES_MAX_INSERT_ROWS` and the bind-parameter limit. Returns the created
   * entities with generated columns written back via RETURNING. Empty input never touches
   * the database.
   */
  @PostgresProfiling()
  async createMany(inputs: readonly TCreateInput[]): Promise<TEntity[]> {
    if (inputs.length === 0) {
      return [];
    }

    const entities = inputs.map((input) => {
      return this.repository.create(this.toEntityInput(input));
    });
    const columnCount = this.repository.metadata.columns.length;
    const chunkSize = Math.min(
      POSTGRES_MAX_INSERT_ROWS,
      Math.max(1, Math.floor(POSTGRES_MAX_BIND_PARAMS / columnCount)),
    );

    await this.repository.manager.transaction(async (manager) => {
      for (let index = 0; index < entities.length; index += chunkSize) {
        // One transaction, and chunks must land in order, so they run sequentially.
        // eslint-disable-next-line no-await-in-loop -- chunks share one transaction and must land in order
        await manager.insert(
          this.repository.target,
          toInsertRows(entities.slice(index, index + chunkSize)),
        );
      }
    });

    return entities;
  }

  /**
   * @description Loads one live row by primary key.
   * @throws NotFoundException when no live row has that id.
   */
  @PostgresProfiling()
  async findById(
    id: string,
    options?: Omit<FindOneOptions<TEntity>, 'where'>,
  ): Promise<TEntity> {
    const entity = await this.repository.findOne({
      ...options,
      where: buildIdWhere<TEntity>(id),
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.tableName} record with ID "${id}" not found`,
      );
    }

    return entity;
  }

  /**
   * @description Passes `options` straight to TypeORM's `findOne`; `null` when nothing matches.
   */
  @PostgresProfiling()
  async findOne(options: FindOneOptions<TEntity>): Promise<TEntity | null> {
    return this.repository.findOne(options);
  }

  /**
   * @description Unbounded `find` passthrough. For server-side jobs only; user-facing reads
   * must use {@link BaseRepository.findByPaginated}. Unlike TypeORM's `findBy(where)`, this
   * takes full `FindManyOptions`.
   */
  @PostgresProfiling()
  async findBy(options?: FindManyOptions<TEntity>): Promise<TEntity[]> {
    return this.repository.find(options);
  }

  /**
   * @description One bounded page. `take` is clamped to 1..`POSTGRES_MAX_PAGE_SIZE`
   * (default `POSTGRES_DEFAULT_PAGE_SIZE`), `skip` is floored at 0, and rows are ordered by
   * id unless `order` is given.
   */
  @PostgresProfiling()
  async findByPaginated(
    options?: FindManyOptions<TEntity>,
  ): Promise<FindByPaginatedResults<TEntity>> {
    const take = Math.min(
      POSTGRES_MAX_PAGE_SIZE,
      Math.max(1, options?.take ?? POSTGRES_DEFAULT_PAGE_SIZE),
    );
    const skip = Math.max(0, options?.skip ?? 0);
    const order = options?.order ?? buildDefaultOrder<TEntity>();
    const [data, totalCount] = await this.repository.findAndCount({
      ...options,
      order,
      skip,
      take,
    });

    return {
      data,
      pageInfo: {
        currentPage: Math.floor(skip / take) + 1,
        hasNextPage: skip + data.length < totalCount,
        totalCount,
      },
    };
  }

  /**
   * @description Soft deletes one live row in a single statement and returns it; an
   * already-deleted row is left untouched and reads as not found.
   * @throws NotFoundException when no live row has that id (including already deleted).
   */
  @PostgresProfiling()
  async remove(id: string): Promise<TEntity> {
    const result = await this.repository
      .createQueryBuilder()
      .softDelete()
      .where(withLiveRows(buildIdWhere<TEntity>(id)))
      .returning('*')
      .execute();
    const row: unknown = Array.isArray(result.raw) ? result.raw[0] : undefined;

    if (!result.affected || !isRawRow(row)) {
      throw new NotFoundException(
        `${this.tableName} record with ID "${id}" not found`,
      );
    }

    return this.repository.create(
      mapRawRowToEntityInput<TEntity>(
        row,
        this.repository.metadata.columns,
        this.repository.manager.connection.driver,
      ),
    );
  }

  /**
   * @description Soft deletes every live row matching `where`. Rows that are already
   * deleted keep their original `deletedAt`.
   * @throws BadRequestException when `where` is empty.
   */
  @PostgresProfiling()
  async removeMany(
    where: FindOptionsWhere<TEntity>,
  ): Promise<RemoveManyResults> {
    this.assertNonEmptyWhere(where, 'removeMany');

    const result = await this.repository.softDelete(withLiveRows(where));

    return { removedCount: result.affected ?? 0 };
  }

  /**
   * @description Applies `input` to one live row and saves it.
   * @throws NotFoundException when no live row has that id.
   */
  @PostgresProfiling()
  async update(id: string, input: TUpdateInput): Promise<TEntity> {
    const entity = await this.repository.findOne({
      where: buildIdWhere<TEntity>(id),
    });

    if (!entity) {
      throw new NotFoundException(
        `${this.tableName} record with ID "${id}" not found`,
      );
    }

    Object.assign(entity, input);

    return this.repository.save(entity);
  }

  /**
   * @description Updates every live row matching `where` in one statement and returns only
   * the count, so it suits large sets. Keep `input` to plain columns or many-to-one
   * references by id; relations that need cascades belong in `update`.
   * @throws BadRequestException when `where` is empty.
   */
  @PostgresProfiling()
  async updateMany(
    where: FindOptionsWhere<TEntity>,
    input: TUpdateInput,
  ): Promise<{ readonly updateCount: number }> {
    this.assertNonEmptyWhere(where, 'updateMany');

    const result = await this.repository.update(
      withLiveRows(where),
      toUpdateValues<TEntity>(input),
    );

    return { updateCount: result.affected ?? 0 };
  }

  /**
   * @description Updates the live rows matching `where` and returns them reloaded. Not
   * atomic: it runs three statements (select ids, update, reload), so a concurrent write
   * can land between them.
   * @throws BadRequestException when `where` is empty or matches more than
   * `POSTGRES_MAX_RETURNING_ROWS` rows.
   */
  @PostgresProfiling()
  async updateManyReturning(
    where: FindOptionsWhere<TEntity>,
    input: TUpdateInput,
  ): Promise<UpdateManyResults<TEntity>> {
    this.assertNonEmptyWhere(where, 'updateManyReturning');

    const matches = await this.repository.find({
      select: ['id'],
      take: POSTGRES_MAX_RETURNING_ROWS + 1,
      where: withLiveRows(where),
    });

    if (matches.length > POSTGRES_MAX_RETURNING_ROWS) {
      throw new BadRequestException(
        `${this.tableName}.updateManyReturning matched more than ${POSTGRES_MAX_RETURNING_ROWS} rows; use updateMany`,
      );
    }

    if (matches.length === 0) {
      return { data: [], updateCount: 0 };
    }

    const idWhere = buildWhereWithIds<TEntity>(
      In(matches.map((match) => match.id)),
    );
    const result = await this.repository.update(
      idWhere,
      toUpdateValues<TEntity>(input),
    );
    const data = await this.repository.find({ where: idWhere });

    return { data, updateCount: result.affected ?? data.length };
  }

  private assertNonEmptyWhere(
    where: FindOptionsWhere<TEntity>,
    method: string,
  ): void {
    if (Object.keys(where).length === 0) {
      throw new BadRequestException(
        `${this.tableName}.${method} refuses an empty where clause`,
      );
    }
  }
}
