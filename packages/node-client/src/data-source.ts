/**
 * @description Shared TypeORM DataSource for OpenThrottle Postgres. Cached per connection string for connection pooling.
 */

import {
  Plan,
  PlanEmbedding,
  PlanOutputStreamChunk,
  Project,
  Task,
  TaskEmbedding,
} from '@openthrottle/nestjs-repositories-server';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { DataSource } from 'typeorm';

/**
 * @description One entry per connection string: the DataSource and the promise of its
 * initialization. Callers share the promise, so concurrent first calls (hybrid search runs its
 * lexical and semantic halves in parallel) wait on one `initialize()`. TypeORM 1.x rejects a
 * second concurrent `initialize()`, and 0.3 opened a second pool.
 */
const cache = new Map<
  string,
  { readonly dataSource: DataSource; readonly ready: Promise<DataSource> }
>();

/**
 * @description Returns a TypeORM DataSource for the given config, creating and initializing one per connection string (connection pooling).
 * Registers Plan, Task, PlanEmbedding, TaskEmbedding, Project, and PlanOutputStreamChunk so repository-based CRUD and relation metadata resolve correctly.
 * A failed initialization is evicted, so the next call retries.
 */
export async function getOrCreateDataSource(): Promise<DataSource> {
  const url = getPostgresUrl();

  const cached = cache.get(url);
  if (cached) {
    return cached.ready;
  }

  const dataSource = new DataSource({
    entities: [
      Plan,
      PlanEmbedding,
      PlanOutputStreamChunk,
      Project,
      Task,
      TaskEmbedding,
    ],
    type: 'postgres',
    url,
  });
  const ready = dataSource.initialize().catch((error: unknown) => {
    cache.delete(url);
    throw error;
  });

  cache.set(url, { dataSource, ready });

  return ready;
}

/**
 * @description Destroys all cached DataSources and clears the cache, releasing every pooled
 * Postgres connection. Call from a shutdown hook on the long-lived stdio server so connections
 * are not held open per connection string for the lifetime of the process.
 */
export async function destroyDataSources(): Promise<void> {
  const entries = [...cache.values()];
  cache.clear();
  await Promise.allSettled(
    entries.map(async (entry) => {
      await entry.ready;
      await entry.dataSource.destroy();
    }),
  );
}

interface QueryResult<T = unknown> {
  readonly rowCount: number;
  readonly rows: T[];
}

/**
 * @description A TypeORM DataSource or transactional EntityManager — anything that can run a raw
 * parameterized query. Lets runQuery be used both standalone and inside ds.transaction(manager => …).
 */
interface Queryable {
  query(sql: string, params?: unknown[]): Promise<unknown>;
}

/**
 * @description Runs a raw query and normalizes the result to { rows, rowCount } (pg-style). Use for call sites that expect res.rows / res.rowCount.
 */
export async function runQuery<T = unknown>(
  ds: Queryable,
  sql: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const raw: unknown = await ds.query(sql, params);
  if (Array.isArray(raw)) {
    return { rowCount: raw.length, rows: raw };
  }

  if (typeof raw === 'object' && raw !== null) {
    const rows = 'rows' in raw && Array.isArray(raw.rows) ? raw.rows : [];
    const rowCount =
      'rowCount' in raw && typeof raw.rowCount === 'number' ? raw.rowCount : 0;

    return { rowCount, rows };
  }

  return { rowCount: 0, rows: [] };
}
