import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  findUncommentedTables,
  stripSqlProse,
} from '../check-migration-table-comments.rules.ts';

describe('stripSqlProse', () => {
  it('removes line comments', () => {
    expect(stripSqlProse('SELECT 1; -- CREATE TABLE x\nSELECT 2;')).toBe(
      'SELECT 1;  \nSELECT 2;',
    );
  });

  it('removes block comments, including multi-line ones', () => {
    expect(stripSqlProse('a /* CREATE TABLE\n x */ b')).toBe('a   b');
  });

  it('removes string literals, honouring doubled-quote escapes', () => {
    expect(stripSqlProse(`IS 'it''s CREATE TABLE y' ;`)).toBe('IS   ;');
  });

  it('keeps dollar-quoted bodies, where a CREATE TABLE is real', () => {
    const sql = 'DO $$ BEGIN CREATE TABLE t (id int); END $$;';

    expect(stripSqlProse(sql)).toBe(sql);
  });
});

describe('findUncommentedTables', () => {
  it('passes a migration that only mentions CREATE TABLE in prose', () => {
    const sql = [
      '-- CREATE TABLE IF NOT EXISTS already guards the original table,',
      '/* so CREATE TABLE already is a no-op here. */',
      'ALTER TABLE plans ADD COLUMN IF NOT EXISTS foo TEXT;',
    ].join('\n');

    expect(findUncommentedTables(sql)).toStrictEqual([]);
  });

  it('fails a real CREATE TABLE without COMMENT ON TABLE', () => {
    const sql = 'CREATE TABLE IF NOT EXISTS widgets (id uuid PRIMARY KEY);';

    expect(findUncommentedTables(sql)).toStrictEqual(['widgets']);
  });

  it('passes a real CREATE TABLE with its COMMENT ON TABLE', () => {
    const sql = [
      'CREATE TABLE widgets (id uuid PRIMARY KEY);',
      `COMMENT ON TABLE widgets IS 'Widgets.';`,
    ].join('\n');

    expect(findUncommentedTables(sql)).toStrictEqual([]);
  });

  it('does not count a table named only inside a comment string', () => {
    const sql = [
      'CREATE TABLE widgets (id uuid PRIMARY KEY);',
      `COMMENT ON TABLE widgets IS 'Replaces CREATE TABLE gadgets.';`,
    ].join('\n');

    expect(findUncommentedTables(sql)).toStrictEqual([]);
  });

  it('is not satisfied by a COMMENT ON TABLE that is itself commented out', () => {
    const sql = [
      'CREATE TABLE widgets (id uuid PRIMARY KEY);',
      `-- COMMENT ON TABLE widgets IS 'todo';`,
    ].join('\n');

    expect(findUncommentedTables(sql)).toStrictEqual(['widgets']);
  });

  // 099 is the migration whose header prose tripped the gate in the 2026-08-23 audit.
  it('passes 099_restore_missing_foreign_keys.sql', () => {
    const sql = readFileSync(
      path.join(
        process.cwd(),
        'databases/openthrottle/migrations/099_restore_missing_foreign_keys.sql',
      ),
      'utf8',
    );

    expect(findUncommentedTables(sql)).toStrictEqual([]);
  });
});
