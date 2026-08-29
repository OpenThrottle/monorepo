#!/usr/bin/env node

/**
 * @description Assert every episode's declared `dataRequirements` against the
 * seeded DEMO database, and exit non-zero if any fails.
 *
 * Run after seeding (`video-seed-verify`). The point is that a missing row
 * fails here, naming the episode it breaks, rather than showing up as an empty
 * state halfway through a take.
 *
 * Reads the demo database, so it refuses a connection whose name does not
 * contain `demo` — the same guard the seeder uses, for the same reason: a
 * green run against the dev database would be meaningless.
 */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';

import { EPISODES } from '../episodes/registry';
import { formatFailure, verifyEpisodeData } from '../snapshot/verify-episodes';

const main = async (): Promise<void> => {
  const url = new URL(getPostgresUrl());
  const database = url.pathname.replace(/^\//, '');

  if (!database.includes('demo')) {
    console.error(
      `verify-demo-data: refusing to verify '${database}' — the name must contain 'demo'. Run it through the seed script's env, which sets OPENTHROTTLE_POSTGRES_URL.`,
    );
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();

  try {
    const episodes = Object.values(EPISODES);
    const results = await verifyEpisodeData(client, episodes);
    const failures = results.filter((result) => !result.satisfied);
    const covered = new Set(results.map((result) => result.episodeId));

    console.log(
      `verify-demo-data: ${results.length} requirement(s) across ${covered.size} episode(s) against '${database}'.`,
    );

    if (failures.length === 0) {
      console.log('verify-demo-data: all requirements satisfied.');
      return;
    }

    for (const failure of failures) {
      console.error(`verify-demo-data: FAIL ${formatFailure(failure)}`);
    }

    console.error(
      `verify-demo-data: ${failures.length} of ${results.length} requirement(s) failed — re-seed, or fix the episode's expectations.`,
    );
    process.exit(1);
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
