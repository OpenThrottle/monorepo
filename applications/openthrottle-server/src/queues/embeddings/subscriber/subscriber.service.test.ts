import { createMock } from '@golevelup/ts-vitest';
import type {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  QueryRunner,
  TransactionCommitEvent,
  TransactionRollbackEvent,
  UpdateEvent,
} from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { EmbeddingsProducerService } from '../producer/producer.service.ts';
import { EmbeddingsSubscriberService } from './subscriber.service.ts';

const enqueue = vi.fn<EmbeddingsProducerService['enqueue']>(() => {
  return Promise.resolve(1);
});

function setup(): {
  readonly subscriber: EmbeddingsSubscriberService;
  readonly subscribers: EntitySubscriberInterface[];
} {
  const subscribers: EntitySubscriberInterface[] = [];
  const subscriber = new EmbeddingsSubscriberService(
    createMock<DataSource>({ subscribers }),
    createMock<EmbeddingsProducerService>({ enqueue }),
  );

  return { subscriber, subscribers };
}

function runner(isTransactionActive: boolean): QueryRunner {
  return createMock<QueryRunner>({ isTransactionActive });
}

function insert(
  queryRunner: QueryRunner,
  tableName: string,
  id: string,
): InsertEvent<unknown> {
  return createMock<InsertEvent<unknown>>({
    entity: { id },
    metadata: { tableName },
    queryRunner,
  });
}

function update(
  queryRunner: QueryRunner,
  tableName: string,
  id: string,
  propertyNames: readonly string[],
): UpdateEvent<unknown> {
  return createMock<UpdateEvent<unknown>>({
    databaseEntity: { id },
    entity: {},
    metadata: { tableName },
    queryRunner,
    updatedColumns: propertyNames.map((propertyName) => {
      return { propertyName };
    }),
  });
}

function commit(queryRunner: QueryRunner): TransactionCommitEvent {
  return createMock<TransactionCommitEvent>({ queryRunner });
}

beforeEach(() => {
  enqueue.mockClear();
});

describe('EmbeddingsSubscriberService', () => {
  test('registers itself on the DataSource', () => {
    const { subscriber, subscribers } = setup();

    expect(subscribers).toContain(subscriber);
  });

  describe('when a plan is created inside a transaction', () => {
    test('enqueues only after the commit', () => {
      const { subscriber } = setup();
      const tx = runner(true);

      subscriber.afterInsert(insert(tx, 'plans', 'p1'));
      expect(enqueue).not.toHaveBeenCalled();

      subscriber.afterTransactionCommit(commit(tx));
      expect(enqueue).toHaveBeenCalledWith([{ entity: 'plan', id: 'p1' }]);
    });
  });

  describe('when a batch of tasks is created in one transaction', () => {
    test('enqueues them together, deduped', () => {
      const { subscriber } = setup();
      const tx = runner(true);

      subscriber.afterInsert(insert(tx, 'tasks', 't1'));
      subscriber.afterInsert(insert(tx, 'tasks', 't2'));
      subscriber.afterUpdate(update(tx, 'tasks', 't1', ['title']));
      subscriber.afterTransactionCommit(commit(tx));

      expect(enqueue).toHaveBeenCalledTimes(1);
      expect(enqueue).toHaveBeenCalledWith([
        { entity: 'task', id: 't1' },
        { entity: 'task', id: 't2' },
      ]);
    });
  });

  describe('when the transaction rolls back', () => {
    test('enqueues nothing', () => {
      const { subscriber } = setup();
      const tx = runner(true);

      subscriber.afterInsert(insert(tx, 'plans', 'p1'));
      subscriber.afterTransactionRollback(
        createMock<TransactionRollbackEvent>({ queryRunner: tx }),
      );
      subscriber.afterTransactionCommit(commit(tx));

      expect(enqueue).not.toHaveBeenCalled();
    });
  });

  describe('when the write runs outside a transaction', () => {
    test('enqueues immediately', () => {
      const { subscriber } = setup();

      subscriber.afterInsert(insert(runner(false), 'custom_prompts', 'cp1'));

      expect(enqueue).toHaveBeenCalledWith([
        { entity: 'custom_prompt', id: 'cp1' },
      ]);
    });
  });

  describe('when a plan or task update changes embedded text', () => {
    test.each([
      ['plans', 'plan', 'description'],
      ['tasks', 'task', 'summary'],
    ])('enqueues %s on a %s change', (tableName, entity, property) => {
      const { subscriber } = setup();

      subscriber.afterUpdate(
        update(runner(false), tableName, 'x1', [property]),
      );

      expect(enqueue).toHaveBeenCalledWith([{ entity, id: 'x1' }]);
    });
  });

  describe('when an update touches only non-embedded columns', () => {
    test('enqueues nothing', () => {
      const { subscriber } = setup();

      subscriber.afterUpdate(
        update(runner(false), 'tasks', 't1', ['status', 'sortOrder']),
      );

      expect(enqueue).not.toHaveBeenCalled();
    });
  });

  describe('when the table is not embedded', () => {
    test('ignores it', () => {
      const { subscriber } = setup();

      subscriber.afterInsert(insert(runner(false), 'plan_runs', 'r1'));

      expect(enqueue).not.toHaveBeenCalled();
    });
  });
});
