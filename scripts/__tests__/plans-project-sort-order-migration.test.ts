import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { stripSqlProse } from '../check-migration-table-comments.rules.ts';

const migrationPath = path.join(
  import.meta.dirname,
  '../../databases/openthrottle/migrations/185_plans_project_sort_order.sql',
);
const sql = readFileSync(migrationPath, 'utf8');
const code = stripSqlProse(sql);

describe('185_plans_project_sort_order.sql', () => {
  describe('column', () => {
    it('adds a nullable integer idempotently and never drops anything', () => {
      expect(code).toMatch(
        /ALTER TABLE plans ADD COLUMN IF NOT EXISTS project_sort_order INTEGER;/,
      );
      expect(code).not.toMatch(/INTEGER NOT NULL/);
      expect(code).not.toMatch(/DROP /i);
    });

    it('comments the column', () => {
      expect(sql).toMatch(/COMMENT ON COLUMN plans\.project_sort_order IS/);
    });
  });

  describe('unique index', () => {
    it('is unique per project, partial on a set position and live rows only', () => {
      expect(code).toMatch(
        /CREATE UNIQUE INDEX IF NOT EXISTS uq_plans_project_id_project_sort_order\s+ON plans \(project_id, project_sort_order\)\s+WHERE project_sort_order IS NOT NULL AND deleted_at IS NULL/,
      );
    });
  });

  describe('backfill', () => {
    const [, backfill = ''] = code.split(/UPDATE plans p/);

    it('numbers live plans that have a project per project by creation order, in 1000s', () => {
      expect(backfill).toMatch(
        /row_number\(\) OVER \(PARTITION BY project_id ORDER BY created_at, id\)\)::int \* 1000/,
      );
      expect(backfill).toMatch(/project_id IS NOT NULL/);
      expect(backfill).toMatch(/deleted_at IS NULL/);
    });

    it('only touches rows without a position, so a re-run is a no-op', () => {
      expect(backfill).toMatch(/p\.project_sort_order IS NULL/);
    });
  });
});
