#!/usr/bin/env node
/**
 * @description Truncates all cortex tables (plans, tasks, embeddings, commit_links, plan_output_stream).
 * Uses CORTEX_POSTGRES_URL or CORTEX_POSTGRES_* env vars. Requires cortex Postgres to be running (e.g. docker-compose).
 * Run before a fresh ingest to avoid duplicate plans.
 */

import { Client } from 'pg';
import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';

async function main(): Promise<void> {
  const config = getCortexPostgresConfig();
  if (!config) {
    throw new Error(
      'Cortex Postgres not configured. Set CORTEX_POSTGRES_URL or CORTEX_POSTGRES_* env vars.',
    );
  }
  const connectionString = config.connectionString;

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      TRUNCATE plan_output_stream, commit_links, task_embeddings, plan_embeddings, tasks, plans
      RESTART IDENTITY CASCADE
    `);
    console.log('Cortex tables truncated.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
