#!/usr/bin/env node

/**
 * @description Create the demo database if it does not already exist. Connects to
 * the `postgres` maintenance database, because `CREATE DATABASE` cannot run
 * inside the database being created and must not run inside a transaction.
 *
 * Split out of seed-demo.sh rather than shelling out to psql: psql is not
 * guaranteed on the host (Postgres runs in a container here), while the `pg`
 * client is already a workspace dependency.
 */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { Client } from 'pg';

const main = async (): Promise<void> => {
  const target = new URL(getPostgresUrl());
  const database = target.pathname.replace(/^\//, '');

  if (!database.includes('demo')) {
    console.error(
      `ensure-demo-database: refusing to create '${database}' — the name must contain 'demo'.`,
    );
    console.error('ensure-demo-database: run it through scripts/seed-demo.sh.');
    process.exit(1);
  }

  // Connect to the maintenance database: CREATE DATABASE cannot run inside the
  // database being created, and cannot run inside a transaction.
  const maintenance = new URL(target.toString());
  maintenance.pathname = '/postgres';

  const client = new Client({ connectionString: maintenance.toString() });

  await client.connect();

  try {
    const existing = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );

    if (existing.rowCount === 1) {
      console.log(`ensure-demo-database: '${database}' already exists.`);
      return;
    }

    // Identifier, not a value — parameters are not allowed here, so quote it.
    await client.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
    console.log(`ensure-demo-database: created '${database}'.`);
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
