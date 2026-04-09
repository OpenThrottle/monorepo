#!/usr/bin/env node

import { Client } from 'pg';
import { getPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';

/**
 * @description Truncates all cortex tables (plans, tasks, embeddings, commit_links, plan_output_stream).
 * Uses POSTGRES_URL or POSTGRES_* env vars. Requires cortex Postgres to be running (e.g. docker-compose).
 * Run before a fresh ingest to avoid duplicate plans.
 */

async function main(): Promise<void> {
  const { connectionString } = getPostgresConfig();

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query(`
      TRUNCATE plan_output_stream, commit_links, task_embeddings, plan_embeddings, tasks, plans
      RESTART IDENTITY CASCADE
    `);

    console.log('OpenThrottle tables truncated.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
