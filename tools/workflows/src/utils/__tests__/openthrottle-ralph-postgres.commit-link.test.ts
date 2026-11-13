/**
 * @description Tests that the postgres-transport insertCommitLinkPostgres writes the work ledger
 * (session + subject + one git_commit artifact) rather than the deprecated commit_links base table.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = {
  connectionString: 'postgres://localhost/openthrottle',
  transport: 'postgres-direct' as const,
};

const mockState: { queryLog: string[] } = { queryLog: [] };

vi.mock('pg', () => ({
  default: {
    Client: class {
      connect(): Promise<void> {
        return Promise.resolve();
      }

      end(): Promise<void> {
        return Promise.resolve();
      }

      query(sql: string): Promise<{ rows: unknown[] }> {
        mockState.queryLog.push(sql);

        if (sql.includes('FROM service_accounts')) {
          return Promise.resolve({ rows: [{ id: 'sa-workflow-ralph' }] });
        }
        if (sql.includes('SELECT id FROM work_sessions WHERE external_ref')) {
          return Promise.resolve({ rows: [{ id: 'sess-1' }] });
        }
        if (sql.includes('INTO work_artifacts')) {
          return Promise.resolve({
            rows: [
              {
                id: 'artifact-1',
                message: 'feat: x',
                produced_at: '2026-07-17T00:00:00.000Z',
              },
            ],
          });
        }
        // BEGIN / COMMIT / INSERT work_sessions / INSERT subject → no rows consumed.
        return Promise.resolve({ rows: [] });
      }
    },
  },
}));

beforeEach(() => {
  mockState.queryLog = [];
});

afterEach(() => {
  vi.resetModules();
});

describe('insertCommitLinkPostgres (work-ledger backed)', () => {
  it('writes the three ledger tables, never commit_links, and returns a CommitLinkRow', async () => {
    const { insertCommitLinkPostgres } =
      await import('../openthrottle-ralph-postgres.js');

    const result = await insertCommitLinkPostgres(mockConfig, {
      message: 'feat: x',
      planId: 'plan-1',
      repo: 'OpenThrottle/monorepo',
      sha: 'abc123',
      taskId: 'task-1',
    });

    const log = mockState.queryLog;
    // Never touches the deprecated base table.
    expect(log.some((sql) => sql.includes('commit_links'))).toBe(false);
    // Transactional.
    expect(log).toContain('BEGIN');
    expect(log).toContain('COMMIT');
    // Writes the three ledger tables.
    expect(log.some((sql) => sql.includes('INTO work_sessions'))).toBe(true);
    expect(log.some((sql) => sql.includes('INTO work_session_subjects'))).toBe(
      true,
    );
    const artifactSql =
      log.find((sql) => sql.includes('INTO work_artifacts')) ?? '';
    // Exactly one git_commit artifact via create-or-promote (never regresses lifecycle/verification).
    expect(artifactSql).toContain(
      'ON CONFLICT (session_id, type, external_key)',
    );
    expect(artifactSql).toContain('DO UPDATE');
    expect(artifactSql).not.toContain('lifecycle = EXCLUDED');
    expect(artifactSql).not.toContain('verification = EXCLUDED');
    // CommitLinkRow shape preserved (id = artifact uuid).
    expect(result).toEqual({
      createdAt: '2026-07-17T00:00:00.000Z',
      id: 'artifact-1',
      message: 'feat: x',
      planId: 'plan-1',
      repo: 'OpenThrottle/monorepo',
      sha: 'abc123',
      taskId: 'task-1',
    });
  });
});
