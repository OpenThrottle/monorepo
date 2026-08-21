#!/usr/bin/env node

/**
 * @description Print the connection URL for the demo database: the workspace's
 * normal Postgres connection with its database name swapped for the demo one.
 *
 * This exists because of a trap. `getPostgresUrl()` resolves
 * `OPENTHROTTLE_POSTGRES_URL` -> `POSTGRES_URL` -> the `POSTGRES_*` pieces, and
 * `applications/openthrottle-server/.env` sets `POSTGRES_URL`. So exporting
 * `POSTGRES_DB=openthrottle_demo` at a server is SILENTLY IGNORED — it keeps
 * talking to the dev database and you find out when the demo login fails. Every
 * demo-scoped process therefore gets `OPENTHROTTLE_POSTGRES_URL`, which wins over
 * both.
 */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';

const main = (): void => {
  const database = process.env.DEMO_POSTGRES_DB?.trim() ?? 'openthrottle_demo';

  if (!database.includes('demo')) {
    console.error(
      `resolve-demo-url: DEMO_POSTGRES_DB must contain 'demo' (got '${database}').`,
    );
    process.exit(1);
  }

  // Resolve without the demo override in play, so we start from the real
  // credentials rather than from a previous invocation's answer.
  const base = { ...process.env };
  delete base.OPENTHROTTLE_POSTGRES_URL;

  const url = new URL(getPostgresUrl(base));
  url.pathname = `/${database}`;

  console.log(url.toString());
};

main();
