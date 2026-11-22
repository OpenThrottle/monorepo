#!/usr/bin/env node

/**
 * @description The snapshot manifest's drift gate: reflect a fully migrated
 * database and run `assertManifestMatchesSchema` against it, without reading a
 * single row. A migration that adds a table or column the manifest does not
 * classify fails here, in CI, instead of at the next `snapshot-export`.
 *
 * CI runs it in the `database-seeds` job, right after that job migrates an
 * empty Postgres. Locally, against any migrated database:
 *
 *   POSTGRES_HOST=localhost pnpm exec tsx --env-file .env \
 *     packages/openthrottle-showroom/src/scripts/check-manifest-drift.ts
 */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';

import { SNAPSHOT_MANIFEST } from '../snapshot/manifest.data.ts';
import { assertManifestMatchesSchema } from '../snapshot/manifest.ts';
import { reflectSchema } from '../snapshot/schema.ts';

const main = async (): Promise<void> => {
  const client = new pg.Client({ connectionString: getPostgresUrl() });

  await client.connect();

  try {
    const schema = await reflectSchema(client);

    assertManifestMatchesSchema(SNAPSHOT_MANIFEST, schema);

    console.log(
      `check-manifest-drift: the snapshot manifest classifies all ${schema.tables.size} tables.`,
    );
  } finally {
    await client.end();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
