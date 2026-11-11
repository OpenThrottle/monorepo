#!/usr/bin/env node

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { Client } from 'pg';

import { databaseNameOf } from '../databases/database-registry.ts';
import { createLogger } from './utils/index.ts';

const logger = createLogger();

/**
 * @description Truncates the ingested plan tables (plans, tasks, embeddings,
 * plan_output_stream) in the openthrottle database ONLY — never cms or any other
 * database in `databases/database-registry.ts`; this exists to clear plans
 * before a fresh ingest, which only the openthrottle database holds.
 * Uses POSTGRES_URL or POSTGRES_* env vars. Requires Postgres to be running (e.g. docker-compose).
 */

async function main(): Promise<void> {
  const connectionString = getPostgresUrl();
  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      TRUNCATE plan_output_stream, task_embeddings, plan_embeddings, tasks, plans
      RESTART IDENTITY CASCADE
    `);

    logger.success(
      `openthrottle database (${databaseNameOf(connectionString)}): plan tables truncated. Other databases were not touched.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
