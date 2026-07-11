/**
 * @description Tests for doc-ingestion prior-state storage (getPriorState, savePriorState, removePriorState).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getPriorState,
  getPriorStateEntry,
  removePriorState,
  savePriorState,
} from '../doc-ingestion-state';

const connectionString = 'postgres://localhost/openthrottle';

const mockQuery = vi.fn();

vi.mock('pg', () => ({
  Client: class MockClient {
    connect = vi.fn().mockResolvedValue(undefined);
    end = vi.fn().mockResolvedValue(undefined);
    query = mockQuery;
  },
}));

afterEach(() => {
  mockQuery.mockReset();
});

describe('getPriorState', () => {
  it('returns empty Map when no rows for scope', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getPriorState(connectionString, 'default');
    expect(result.size).toBe(0);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('doc_ingestion_state'),
      ['default'],
    );
  });

  it('returns path -> entry map when rows exist', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          content_hash: 'abc123',
          path: 'docs/foo.md',
          updated_at: new Date('2025-01-01T00:00:00Z'),
        },
        {
          content_hash: 'def456',
          path: 'docs/bar.md',
          updated_at: new Date('2025-01-02T00:00:00Z'),
        },
      ],
    });
    const result = await getPriorState(connectionString, 'default');
    expect(result.size).toBe(2);
    expect(result.get('docs/foo.md')).toEqual({
      contentHash: 'abc123',
      updatedAt: new Date('2025-01-01T00:00:00Z'),
    });
    expect(result.get('docs/bar.md')).toEqual({
      contentHash: 'def456',
      updatedAt: new Date('2025-01-02T00:00:00Z'),
    });
  });
});

describe('savePriorState', () => {
  it('does not query when entries is empty', async () => {
    await savePriorState(connectionString, 'default', []);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('upserts entries with scope, path, contentHash', async () => {
    mockQuery.mockResolvedValueOnce(undefined);
    await savePriorState(connectionString, 'scope1', [
      { contentHash: 'hash1', path: 'docs/a.md' },
      { contentHash: 'hash2', path: 'docs/b.md' },
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const saveCall = mockQuery.mock.calls[0];
    if (saveCall === undefined) {
      throw new Error('expected savePriorState to invoke query');
    }
    const [sql, params] = saveCall;
    expect(sql).toContain('doc_ingestion_state');
    expect(sql).toContain('ON CONFLICT');
    expect(params).toEqual([
      'scope1',
      ['docs/a.md', 'docs/b.md'],
      ['hash1', 'hash2'],
    ]);
  });
});

describe('removePriorState', () => {
  it('does not query when paths is empty', async () => {
    await removePriorState(connectionString, 'default', []);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('deletes by scope and path array', async () => {
    mockQuery.mockResolvedValueOnce(undefined);
    await removePriorState(connectionString, 'scope1', [
      'docs/old.md',
      'docs/gone.md',
    ]);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const removeCall = mockQuery.mock.calls[0];
    if (removeCall === undefined) {
      throw new Error('expected removePriorState to invoke query');
    }
    const [sql, params] = removeCall;
    expect(sql).toContain('DELETE FROM doc_ingestion_state');
    expect(sql).toContain('scope = $1');
    expect(sql).toContain('path = ANY');
    expect(params).toEqual(['scope1', ['docs/old.md', 'docs/gone.md']]);
  });
});

describe('getPriorStateEntry', () => {
  it('returns undefined when no row for (scope, path)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await getPriorStateEntry(
      connectionString,
      'default',
      'docs/missing.md',
    );
    expect(result).toBeUndefined();
  });

  it('returns entry when row exists', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          content_hash: 'xyz',
          updated_at: new Date('2025-02-01T12:00:00Z'),
        },
      ],
    });
    const result = await getPriorStateEntry(
      connectionString,
      'default',
      'docs/one.md',
    );
    expect(result).toEqual({
      contentHash: 'xyz',
      updatedAt: new Date('2025-02-01T12:00:00Z'),
    });
  });
});
