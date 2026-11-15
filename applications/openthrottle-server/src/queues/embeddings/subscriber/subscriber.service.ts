/**
 * @description The one TypeORM subscriber that feeds the embeddings queue (OT plan 165e86ef).
 * It hears every insert and update on plans, tasks and custom prompts — resolvers, the MCP
 * batch creates, status services, anything that writes through TypeORM — so no write path has
 * to remember to embed. Raw-SQL writes (the ingest scripts, documentation) are not seen; the
 * reconciler covers them.
 *
 * Ids are buffered per transaction and enqueued only after it commits, so a job never reads a
 * row that is not visible yet; a rollback drops them. Enqueueing never fails the write.
 */

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type {
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  TransactionCommitEvent,
  TransactionRollbackEvent,
  UpdateEvent,
} from 'typeorm';
import { DataSource } from 'typeorm';

import {
  EMBEDDED_PROPERTIES,
  SUBSCRIBED_TABLES,
} from '../embeddings.constants.ts';
import type { EmbedEntityJobData } from '../embeddings.types.ts';
import { embeddingJobId, readEntityId } from '../embeddings.utils.ts';
import { EmbeddingsProducerService } from '../producer/producer.service.ts';

@Injectable()
export class EmbeddingsSubscriberService implements EntitySubscriberInterface {
  private readonly pending = new WeakMap<
    QueryRunner,
    Map<string, EmbedEntityJobData>
  >();

  constructor(
    @InjectDataSource()
    dataSource: DataSource,
    private readonly producer: EmbeddingsProducerService,
  ) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<unknown>): void {
    this.track(
      event.queryRunner,
      event.metadata.tableName,
      readEntityId(event.entity),
    );
  }

  afterUpdate(event: UpdateEvent<unknown>): void {
    const touchesContent =
      event.updatedColumns.length === 0 ||
      event.updatedColumns.some((column) => {
        return EMBEDDED_PROPERTIES.some((property) => {
          return property === column.propertyName;
        });
      });

    if (!touchesContent) {
      return;
    }

    this.track(
      event.queryRunner,
      event.metadata.tableName,
      readEntityId(event.entity) ?? readEntityId(event.databaseEntity),
    );
  }

  afterTransactionCommit(event: TransactionCommitEvent): void {
    const items = this.pending.get(event.queryRunner);

    if (!items) {
      return;
    }

    this.pending.delete(event.queryRunner);
    void this.producer.enqueue([...items.values()]);
  }

  afterTransactionRollback(event: TransactionRollbackEvent): void {
    this.pending.delete(event.queryRunner);
  }

  private track(
    queryRunner: QueryRunner,
    tableName: string,
    id: string | undefined,
  ): void {
    const entity = SUBSCRIBED_TABLES[tableName];

    if (!entity || !id) {
      return;
    }

    const item: EmbedEntityJobData = { entity, id };

    if (!queryRunner.isTransactionActive) {
      void this.producer.enqueue([item]);
      return;
    }

    const items = this.pending.get(queryRunner) ?? new Map();

    items.set(embeddingJobId(entity, id), item);
    this.pending.set(queryRunner, items);
  }
}
