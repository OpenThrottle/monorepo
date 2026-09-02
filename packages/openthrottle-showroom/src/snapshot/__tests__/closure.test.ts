import { describe, expect, test } from 'vitest';

import type { RowFetcher, SnapshotScope } from '../closure';
import {
  collectSnapshotRows,
  computeDownwardTables,
  orderTablesTopologically,
} from '../closure';
import type { DatabaseSchema, TableSchema } from '../schema';

/**
 * A miniature of the real graph: `plans` is the windowed root; `tasks` (with a
 * self-FK) and `plan_runs` hang below it; `projects` and `users` are
 * integrity-only parents; `mcp_connector_connections` hangs below `users` and
 * must NEVER be pulled just because a user was — that asymmetry is the whole
 * point of the closure.
 */
const schema: DatabaseSchema = {
  foreignKeys: [
    {
      childColumn: 'user_id',
      childTable: 'mcp_connector_connections',
      name: 'fk_conn_user',
      parentColumn: 'id',
      parentTable: 'users',
    },
    {
      childColumn: 'actor_user_id',
      childTable: 'plan_runs',
      name: 'fk_run_user',
      parentColumn: 'id',
      parentTable: 'users',
    },
    {
      childColumn: 'plan_id',
      childTable: 'plan_runs',
      name: 'fk_run_plan',
      parentColumn: 'id',
      parentTable: 'plans',
    },
    {
      childColumn: 'project_id',
      childTable: 'plans',
      name: 'fk_plan_project',
      parentColumn: 'id',
      parentTable: 'projects',
    },
    {
      childColumn: 'parent_task_id',
      childTable: 'tasks',
      name: 'fk_task_parent',
      parentColumn: 'id',
      parentTable: 'tasks',
    },
    {
      childColumn: 'plan_id',
      childTable: 'tasks',
      name: 'fk_task_plan',
      parentColumn: 'id',
      parentTable: 'plans',
    },
  ],
  tables: new Map(
    [
      { columns: ['id', 'user_id'], name: 'mcp_connector_connections' },
      { columns: ['id', 'actor_user_id', 'plan_id'], name: 'plan_runs' },
      { columns: ['id', 'created_at', 'project_id'], name: 'plans' },
      { columns: ['id'], name: 'projects' },
      {
        columns: ['id', 'created_at', 'parent_task_id', 'plan_id'],
        name: 'tasks',
      },
      { columns: ['id'], name: 'users' },
    ].map((table) => [
      table.name,
      {
        ...table,
        columnTypes: Object.fromEntries(
          table.columns.map((column) => [column, 'text']),
        ),
        primaryKey: ['id'],
      },
    ]),
  ),
  uniqueKeys: [],
};

const rows: Record<string, Record<string, unknown>[]> = {
  mcp_connector_connections: [{ id: 'c1', user_id: 'u1' }],
  plan_runs: [
    { actor_user_id: 'u1', id: 'r1', plan_id: 'pl-new' },
    { actor_user_id: 'u1', id: 'r2', plan_id: 'pl-old' },
  ],
  plans: [
    { created_at: '2026-01-10T00:00:00Z', id: 'pl-new', project_id: 'p1' },
    { created_at: '2020-01-01T00:00:00Z', id: 'pl-old', project_id: 'p1' },
  ],
  projects: [{ id: 'p1' }, { id: 'p-unused' }],
  tasks: [
    {
      created_at: '2026-01-11T00:00:00Z',
      id: 't1',
      parent_task_id: null,
      plan_id: 'pl-new',
    },
    {
      created_at: '2026-01-12T00:00:00Z',
      id: 't2',
      parent_task_id: 't1',
      plan_id: 'pl-new',
    },
    {
      created_at: '2020-01-02T00:00:00Z',
      id: 't3',
      parent_task_id: null,
      plan_id: 'pl-old',
    },
  ],
  users: [{ id: 'u1' }, { id: 'u-unused' }],
};

const fetcher: RowFetcher = {
  fetchAll: (table) => Promise.resolve(rows[table] ?? []),
  fetchByColumn: (table, column, values) => {
    const wanted = values.map(String);

    return Promise.resolve(
      (rows[table] ?? []).filter((row) => wanted.includes(String(row[column]))),
    );
  },
  fetchSince: (table, column, cutoffIso) =>
    Promise.resolve(
      (rows[table] ?? []).filter((row) => String(row[column]) >= cutoffIso),
    ),
};

const scope: SnapshotScope = {
  fullRoots: [],
  windowedRoots: [{ table: 'plans', windowColumn: 'created_at' }],
};

describe('computeDownwardTables', () => {
  test('reaches descendants of the roots but not children of integrity-only parents', () => {
    const downward = computeDownwardTables(schema, ['plans']);

    expect([...downward].sort()).toEqual(['plan_runs', 'plans', 'tasks']);
  });
});

describe('collectSnapshotRows', () => {
  test('windows the roots, pulls children downward and parents upward', async () => {
    const selected = await collectSnapshotRows(
      fetcher,
      schema,
      scope,
      '2026-01-01T00:00:00Z',
    );

    const ids = (table: string): string[] =>
      [...(selected.get(table)?.values() ?? [])]
        .map((row) => String(row.id))
        .sort();

    expect(ids('plans')).toEqual(['pl-new']);
    expect(ids('tasks')).toEqual(['t1', 't2']);
    expect(ids('plan_runs')).toEqual(['r1']);
    expect(ids('projects')).toEqual(['p1']);
    expect(ids('users')).toEqual(['u1']);
  });

  test('never expands children of a parent added only for integrity', async () => {
    const selected = await collectSnapshotRows(
      fetcher,
      schema,
      scope,
      '2026-01-01T00:00:00Z',
    );

    expect(selected.get('mcp_connector_connections')).toBeUndefined();
  });

  test('fails loudly when a root table does not exist', async () => {
    await expect(
      collectSnapshotRows(
        fetcher,
        schema,
        { fullRoots: ['does_not_exist'], windowedRoots: [] },
        '2026-01-01T00:00:00Z',
      ),
    ).rejects.toThrow(/does_not_exist/);
  });

  test('fails loudly when a windowed root lacks its window column', async () => {
    await expect(
      collectSnapshotRows(
        fetcher,
        schema,
        {
          fullRoots: [],
          windowedRoots: [{ table: 'users', windowColumn: 'created_at' }],
        },
        '2026-01-01T00:00:00Z',
      ),
    ).rejects.toThrow(/no column 'created_at'/);
  });
});

describe('orderTablesTopologically', () => {
  test('orders parents first, alphabetical among ties, ignoring self-references', () => {
    expect(
      orderTablesTopologically(schema, [
        'tasks',
        'plan_runs',
        'plans',
        'users',
        'projects',
      ]),
    ).toEqual(['projects', 'users', 'plans', 'plan_runs', 'tasks']);
  });

  test('fails loudly on a cross-table cycle', () => {
    const cyclic: DatabaseSchema = {
      foreignKeys: [
        {
          childColumn: 'b_id',
          childTable: 'a',
          name: 'fk_a_b',
          parentColumn: 'id',
          parentTable: 'b',
        },
        {
          childColumn: 'a_id',
          childTable: 'b',
          name: 'fk_b_a',
          parentColumn: 'id',
          parentTable: 'a',
        },
      ],
      tables: new Map<string, TableSchema>([
        [
          'a',
          {
            columnTypes: { b_id: 'text', id: 'text' },
            columns: ['id', 'b_id'],
            name: 'a',
            primaryKey: ['id'],
          },
        ],
        [
          'b',
          {
            columnTypes: { a_id: 'text', id: 'text' },
            columns: ['id', 'a_id'],
            name: 'b',
            primaryKey: ['id'],
          },
        ],
      ]),
      uniqueKeys: [],
    };

    expect(() => orderTablesTopologically(cyclic, ['a', 'b'])).toThrow(/cycle/);
  });
});
