import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { stripSqlProse } from '../check-migration-table-comments.rules.ts';

const migrationPath = path.join(
  import.meta.dirname,
  '../../databases/openthrottle/migrations/184_project_repositories.sql',
);
const sql = readFileSync(migrationPath, 'utf8');
const code = stripSqlProse(sql);

describe('184_project_repositories.sql', () => {
  describe('table shape', () => {
    it('creates the join table idempotently with a uuidv7 key and a unique pair', () => {
      expect(code).toMatch(/CREATE TABLE IF NOT EXISTS project_repositories/);
      expect(code).toMatch(/id UUID PRIMARY KEY DEFAULT uuidv7\(\)/);
      expect(code).toMatch(/UNIQUE \(project_id, repository_id\)/);
    });

    it('cascades both foreign keys, each in its own guarded statement', () => {
      expect(code).toMatch(
        /FOREIGN KEY \(project_id\) REFERENCES projects \(id\) ON DELETE CASCADE/,
      );
      expect(code).toMatch(
        /FOREIGN KEY \(repository_id\) REFERENCES repositories \(id\) ON DELETE CASCADE/,
      );
      expect(code).not.toMatch(/project_id UUID NOT NULL REFERENCES/);
    });

    it('indexes repository_id and keeps updated_at current', () => {
      expect(code).toMatch(
        /CREATE INDEX IF NOT EXISTS idx_project_repositories_repository_id\s+ON project_repositories \(repository_id\)/,
      );
      expect(code).toMatch(/update_updated_at_column\(\)/);
    });

    it('comments the table', () => {
      expect(sql).toMatch(/COMMENT ON TABLE project_repositories IS/);
    });
  });

  describe('backfill', () => {
    const [, backfill = ''] = code.split(/INSERT INTO project_repositories/);
    const statement = backfill.split(';')[0] ?? '';

    it('copies the legacy link for live repositories pointing at live projects only', () => {
      expect(statement).toMatch(/SELECT r\.project_id, r\.id/);
      expect(statement).toMatch(
        /JOIN projects p ON p\.id = r\.project_id AND p\.deleted_at IS NULL/,
      );
      expect(statement).toMatch(/r\.project_id IS NOT NULL/);
      expect(statement).toMatch(/r\.deleted_at IS NULL/);
    });

    it('is safe to re-run', () => {
      expect(statement).toMatch(
        /ON CONFLICT \(project_id, repository_id\) DO NOTHING/,
      );
    });
  });

  describe('legacy column', () => {
    it('deprecates repositories.project_id in a comment and never drops it', () => {
      expect(sql).toMatch(
        /COMMENT ON COLUMN repositories\.project_id IS 'DEPRECATED: use project_repositories/,
      );
      expect(code).not.toMatch(/DROP COLUMN/i);
    });
  });
});
