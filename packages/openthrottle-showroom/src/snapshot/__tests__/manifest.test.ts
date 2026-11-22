import { describe, expect, test } from 'vitest';

import { SNAPSHOT_MANIFEST } from '../manifest.data.ts';
import type { SnapshotManifest } from '../manifest.ts';
import {
  assertManifestMatchesSchema,
  assertTableExportable,
  exportableSchema,
} from '../manifest.ts';
import type { DatabaseSchema } from '../schema.ts';

/**
 * Each test reproduces one schema-drift failure mode against a mocked
 * reflection — the done-when of the manifest task. The messages are asserted
 * because their whole value is telling the next migration author what to do.
 */
const makeSchema = (
  tables: {
    columns: Record<string, string>;
    name: string;
  }[],
): DatabaseSchema => {
  return {
    foreignKeys: [],
    tables: new Map(
      tables.map((table) => [
        table.name,
        {
          columnTypes: table.columns,
          columns: Object.keys(table.columns),
          name: table.name,
          primaryKey: ['id'],
        },
      ]),
    ),
    uniqueKeys: [],
  };
};

const manifest: SnapshotManifest = {
  plans: {
    classification: 'exported',
    columns: {
      embedding: {
        action: 'keep',
        reason: 'embedding vector',
        vectorDimension: 1536,
      },
      id: { action: 'keep', reason: 'identifier' },
      title: { action: 'scrub', reason: 'free text' },
    },
    reason: 'test fixture',
  },
  secrets: {
    classification: 'denied',
    reason: 'test fixture',
  },
};

const PLAN_TO_SECRET_EDGE = {
  childColumn: 'secret_id',
  childTable: 'plans',
  name: 'fk_plans_secret',
  parentColumn: 'id',
  parentTable: 'secrets',
};

const withSecretReference = (
  action: 'drop' | 'keep',
): { manifest: SnapshotManifest; schema: DatabaseSchema } => {
  const schema = makeSchema([
    {
      columns: {
        embedding: 'vector(1536)',
        id: 'uuid',
        secret_id: 'uuid',
        title: 'text',
      },
      name: 'plans',
    },
    { columns: { id: 'uuid', token: 'text' }, name: 'secrets' },
  ]);
  const plans = manifest.plans;

  if (plans === undefined || plans.classification !== 'exported') {
    throw new Error('fixture plans must be exported');
  }

  return {
    manifest: {
      ...manifest,
      plans: {
        ...plans,
        columns: {
          ...plans.columns,
          secret_id: { action, reason: 'reference to a denied table' },
        },
      },
    },
    schema: { ...schema, foreignKeys: [PLAN_TO_SECRET_EDGE] },
  };
};

const matchingSchema = makeSchema([
  {
    columns: { embedding: 'vector(1536)', id: 'uuid', title: 'text' },
    name: 'plans',
  },
  { columns: { id: 'uuid', token: 'text' }, name: 'secrets' },
]);

describe('assertManifestMatchesSchema', () => {
  test('passes when manifest and schema agree', () => {
    expect(() =>
      assertManifestMatchesSchema(manifest, matchingSchema),
    ).not.toThrow();
  });

  test('a table missing from the manifest (new migration) fails naming it', () => {
    const schema = makeSchema([
      ...[...matchingSchema.tables.values()].map((table) => ({
        columns: table.columnTypes,
        name: table.name,
      })),
      { columns: { id: 'uuid' }, name: 'brand_new_table' },
    ]);

    expect(() => assertManifestMatchesSchema(manifest, schema)).toThrow(
      /table 'brand_new_table' is not classified — decide exported\/denied\/ignored/,
    );
  });

  test('a new column on an exported table fails naming table and column', () => {
    const schema = makeSchema([
      {
        columns: {
          embedding: 'vector(1536)',
          id: 'uuid',
          sneaky_new_column: 'text',
          title: 'text',
        },
        name: 'plans',
      },
      { columns: { id: 'uuid', token: 'text' }, name: 'secrets' },
    ]);

    expect(() => assertManifestMatchesSchema(manifest, schema)).toThrow(
      /column 'plans\.sneaky_new_column' is not classified — decide keep\/scrub\/drop/,
    );
  });

  test('a manifest column that no longer exists is reported as a rename/drop', () => {
    const schema = makeSchema([
      { columns: { embedding: 'vector(1536)', id: 'uuid' }, name: 'plans' },
      { columns: { id: 'uuid', token: 'text' }, name: 'secrets' },
    ]);

    expect(() => assertManifestMatchesSchema(manifest, schema)).toThrow(
      /column 'plans\.title' which no longer exists — it was renamed or dropped/,
    );
  });

  test('a manifest table that no longer exists is reported as a rename/drop', () => {
    const schema = makeSchema([
      {
        columns: { embedding: 'vector(1536)', id: 'uuid', title: 'text' },
        name: 'plans',
      },
    ]);

    expect(() => assertManifestMatchesSchema(manifest, schema)).toThrow(
      /table 'secrets' which no longer exists — it was renamed or dropped/,
    );
  });

  test('a changed vector dimension fails as a model/dimension change', () => {
    const schema = makeSchema([
      {
        columns: { embedding: 'vector(768)', id: 'uuid', title: 'text' },
        name: 'plans',
      },
      { columns: { id: 'uuid', token: 'text' }, name: 'secrets' },
    ]);

    expect(() => assertManifestMatchesSchema(manifest, schema)).toThrow(
      /vector column 'plans\.embedding' is vector\(768\) in the database but the manifest pins 1536/,
    );
  });

  test('an unpinned vector column fails asking for the pin', () => {
    const unpinned: SnapshotManifest = {
      ...manifest,
      plans: {
        classification: 'exported',
        columns: {
          embedding: { action: 'keep', reason: 'embedding vector' },
          id: { action: 'keep', reason: 'identifier' },
          title: { action: 'scrub', reason: 'free text' },
        },
        reason: 'test fixture',
      },
    };

    expect(() => assertManifestMatchesSchema(unpinned, matchingSchema)).toThrow(
      /vector column 'plans\.embedding' has no pinned vectorDimension/,
    );
  });
});

describe('assertManifestMatchesSchema — references to non-exported tables', () => {
  test('a kept reference to a denied parent fails asking for drop', () => {
    const fixture = withSecretReference('keep');

    expect(() =>
      assertManifestMatchesSchema(fixture.manifest, fixture.schema),
    ).toThrow(
      /column 'plans\.secret_id' references 'secrets', which is denied — .* classify the column 'drop'/,
    );
  });

  test('a dropped reference to a denied parent passes', () => {
    const fixture = withSecretReference('drop');

    expect(() =>
      assertManifestMatchesSchema(fixture.manifest, fixture.schema),
    ).not.toThrow();
  });
});

describe('exportableSchema', () => {
  test('removes every edge that touches a non-exported table', () => {
    const fixture = withSecretReference('drop');

    expect(
      exportableSchema(fixture.manifest, fixture.schema).foreignKeys,
    ).toEqual([]);
  });

  test('keeps edges between exported tables', () => {
    const selfEdge = { ...PLAN_TO_SECRET_EDGE, parentTable: 'plans' };
    const schema = { ...matchingSchema, foreignKeys: [selfEdge] };

    expect(exportableSchema(manifest, schema).foreignKeys).toEqual([selfEdge]);
  });
});

describe('assertTableExportable', () => {
  test('rejects a denied table the closure reached', () => {
    expect(() => assertTableExportable(manifest, 'secrets')).toThrow(
      /reached table 'secrets' but the manifest classifies it as 'denied'/,
    );
  });

  test('returns the exported entry for an exported table', () => {
    expect(assertTableExportable(manifest, 'plans').classification).toBe(
      'exported',
    );
  });
});

describe('SNAPSHOT_MANIFEST (the committed classification)', () => {
  test('every exported table has a reason on every column', () => {
    for (const entry of Object.values(SNAPSHOT_MANIFEST)) {
      expect(entry.reason.length).toBeGreaterThan(0);

      if (entry.classification === 'exported') {
        for (const column of Object.values(entry.columns)) {
          expect(column.reason.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('credential-adjacent tables are denied', () => {
    for (const table of [
      'agent_accounts',
      'agent_trajectories',
      'mcp_connector_connections',
      'oauth_authorization_requests',
      'oauth_clients',
      'oauth_grants',
      'oauth_tokens',
      'scheduled_agent_job_webhook_deliveries',
      'scheduled_agent_job_webhook_triggers',
      'service_account_credentials',
      'subscriptions',
    ]) {
      expect(SNAPSHOT_MANIFEST[table]?.classification).toBe('denied');
    }
  });

  test('password hashes never export', () => {
    const users = SNAPSHOT_MANIFEST.users;

    if (users === undefined || users.classification !== 'exported') {
      throw new Error('users must be exported');
    }

    expect(users.columns.password_hash?.action).toBe('drop');
  });
});
