/**
 * @description Shared TypeORM DataSource for Cortex Postgres. Cached per connection string for connection pooling.
 */

import {
  CommitLink,
  Plan,
  PlanEmbedding,
  PlanOutputStreamChunk,
  Project,
  Task,
  TaskEmbedding,
} from '@openthrottle/nestjs-repositories';
import { DataSource } from 'typeorm';
import type { CortexPostgresConfig } from './config.js';

const cache = new Map<string, DataSource>();

/**
 * @description Returns a TypeORM DataSource for the given config, creating and initializing one per connection string (connection pooling).
 * Registers Plan, Task, PlanEmbedding, TaskEmbedding, Project, CommitLink, and PlanOutputStreamChunk so repository-based CRUD and relation metadata (e.g. Plan#commitLinks) resolve correctly.
 */
export async function getOrCreateDataSource(
  config: CortexPostgresConfig,
): Promise<DataSource> {
  const key = config.connectionString;
  let ds = cache.get(key);
  if (ds?.isInitialized) {
    return ds;
  }
  if (ds != null) {
    await ds.initialize();
    return ds;
  }
  ds = new DataSource({
    entities: [
      CommitLink,
      Plan,
      PlanEmbedding,
      PlanOutputStreamChunk,
      Project,
      Task,
      TaskEmbedding,
    ],
    type: 'postgres',
    url: config.connectionString,
  });
  cache.set(key, ds);
  await ds.initialize();
  return ds;
}

interface QueryResult<T = unknown> {
  readonly rows: T[];
  readonly rowCount: number;
}

/**
 * @description Runs a raw query and normalizes the result to { rows, rowCount } (pg-style). Use for call sites that expect res.rows / res.rowCount.
 */
export async function runQuery<T = unknown>(
  ds: DataSource,
  sql: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const raw = await ds.query(sql, params);
  if (Array.isArray(raw)) {
    return { rowCount: raw.length, rows: raw as T[] };
  }
  const r = raw as { rows?: T[]; rowCount?: number };
  return { rowCount: r.rowCount ?? 0, rows: r.rows ?? [] };
}
