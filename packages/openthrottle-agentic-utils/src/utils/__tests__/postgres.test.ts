import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CMS_DEFAULT_DATABASE_NAME,
  CMS_POSTGRES_DB_ENV,
  CMS_POSTGRES_URL_ENV,
  ensurePostgresReachable,
  getCmsPostgresUrl,
  getPostgresUrl,
  OPENTHROTTLE_POSTGRES_URL_ENV,
  POSTGRES_UNREACHABLE_HINT,
  POSTGRES_URL_MISSING_ERROR,
  sanitizePostgresUrlForLogs,
  UNPARSEABLE_POSTGRES_URL_LOG_LABEL,
} from '../postgres.ts';

const mockState: {
  connectReject: Error | undefined;
  endReject: Error | undefined;
  queryLog: string[];
  queryReject: Error | undefined;
} = {
  connectReject: undefined,
  endReject: undefined,
  queryLog: [],
  queryReject: undefined,
};

vi.mock('pg', () => ({
  default: {
    Client: class {
      connect(): Promise<void> {
        return mockState.connectReject
          ? Promise.reject(mockState.connectReject)
          : Promise.resolve();
      }

      end(): Promise<void> {
        return mockState.endReject
          ? Promise.reject(mockState.endReject)
          : Promise.resolve();
      }

      query(sql: string): Promise<{ rows: unknown[] }> {
        mockState.queryLog.push(sql);

        return mockState.queryReject
          ? Promise.reject(mockState.queryReject)
          : Promise.resolve({ rows: [{}] });
      }
    },
  },
}));

describe('ensurePostgresReachable', () => {
  beforeEach(() => {
    mockState.connectReject = undefined;
    mockState.endReject = undefined;
    mockState.queryReject = undefined;
    mockState.queryLog = [];
  });

  afterEach(() => {
    mockState.connectReject = undefined;
    mockState.endReject = undefined;
    mockState.queryReject = undefined;
    mockState.queryLog = [];
  });

  it('throws when connection string is empty', async () => {
    await expect(ensurePostgresReachable('')).rejects.toThrow(
      'Postgres connection string is required.',
    );
    await expect(ensurePostgresReachable('   ')).rejects.toThrow(
      'Postgres connection string is required.',
    );
  });

  it('throws with hint when connect fails', async () => {
    mockState.connectReject = new Error('Connection refused');

    await expect(
      ensurePostgresReachable('postgresql://user:pass@localhost:5432/db'),
    ).rejects.toThrow(/Postgres database is unreachable/);
    await expect(
      ensurePostgresReachable('postgresql://user:pass@localhost:5432/db'),
    ).rejects.toThrow(/Connection refused/);
    await expect(
      ensurePostgresReachable('postgresql://user:pass@localhost:5432/db'),
    ).rejects.toThrow(POSTGRES_UNREACHABLE_HINT);
  });

  it('throws with hint when SELECT 1 fails', async () => {
    mockState.queryReject = new Error('permission denied');

    await expect(
      ensurePostgresReachable('postgresql://user:pass@localhost:5432/db'),
    ).rejects.toThrow(/permission denied/);
  });

  it('runs SELECT 1 and resolves when connect succeeds', async () => {
    await expect(
      ensurePostgresReachable('postgresql://user:pass@localhost:5432/db'),
    ).resolves.toBeUndefined();

    expect(mockState.queryLog).toEqual(['SELECT 1']);
  });

  it('trims whitespace from the connection string', async () => {
    await expect(
      ensurePostgresReachable('  postgresql://user:pass@localhost:5432/db  '),
    ).resolves.toBeUndefined();
  });
});

describe('sanitizePostgresUrlForLogs', () => {
  it('strips the password from a standard Postgres URL', () => {
    const sanitized = sanitizePostgresUrlForLogs(
      'postgresql://user:secret@localhost:5432/mydb',
    );

    expect(sanitized).toBe('postgresql://user@localhost:5432/mydb');
    expect(sanitized).not.toContain('secret');
  });

  it('preserves username, host, port, and database when password is absent', () => {
    expect(
      sanitizePostgresUrlForLogs('postgresql://user@localhost:5432/mydb'),
    ).toBe('postgresql://user@localhost:5432/mydb');
  });

  it('returns a fixed label when the URL cannot be parsed', () => {
    expect(sanitizePostgresUrlForLogs('not-a-url')).toBe(
      UNPARSEABLE_POSTGRES_URL_LOG_LABEL,
    );
  });
});

describe('getPostgresUrl', () => {
  describe('when OPENTHROTTLE_POSTGRES_URL is set', () => {
    it('prefers OPENTHROTTLE_POSTGRES_URL over POSTGRES_URL', () => {
      const conn = getPostgresUrl({
        [OPENTHROTTLE_POSTGRES_URL_ENV]: `postgresql://openthrottle@db.example:5432/openthrottle`,
        POSTGRES_URL: 'postgresql://foreign@localhost:5432/wrong_db',
      });

      expect(conn).toBe(
        'postgresql://openthrottle@db.example:5432/openthrottle',
      );
    });

    it('trims whitespace from OPENTHROTTLE_POSTGRES_URL', () => {
      const conn = getPostgresUrl({
        [OPENTHROTTLE_POSTGRES_URL_ENV]: `  postgresql://openthrottle@db.example:5432/openthrottle  `,
      });

      expect(conn).toBe(
        'postgresql://openthrottle@db.example:5432/openthrottle',
      );
    });
  });

  describe('when POSTGRES_URL is set', () => {
    it('returns POSTGRES_URL when postgres url is absent', () => {
      const conn = getPostgresUrl({
        POSTGRES_URL: 'postgresql://user:pass@localhost:5432/mydb',
      });

      expect(conn).toBe('postgresql://user:pass@localhost:5432/mydb');
    });

    it('trims whitespace from POSTGRES_URL', () => {
      const conn = getPostgresUrl({
        POSTGRES_URL: '  postgresql://user:pass@localhost:5432/mydb  ',
      });

      expect(conn).toBe('postgresql://user:pass@localhost:5432/mydb');
    });

    it('falls through empty OPENTHROTTLE_POSTGRES_URL to POSTGRES_URL', () => {
      const conn = getPostgresUrl({
        [OPENTHROTTLE_POSTGRES_URL_ENV]: '   ',
        POSTGRES_URL: 'postgresql://user:pass@localhost:5432/mydb',
      });

      expect(conn).toBe('postgresql://user:pass@localhost:5432/mydb');
    });
  });

  describe('when POSTGRES_* pieces are set', () => {
    it('builds a connection string from individual env vars', () => {
      const conn = getPostgresUrl({
        POSTGRES_DB: 'mydb',
        POSTGRES_HOST: 'localhost',
        POSTGRES_PASSWORD: 'secret',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'user',
      });

      expect(conn).toBe('postgresql://user:secret@localhost:5432/mydb');
    });

    it('URL-encodes the password', () => {
      const conn = getPostgresUrl({
        POSTGRES_DB: 'mydb',
        POSTGRES_HOST: 'localhost',
        POSTGRES_PASSWORD: 'p@ss:w/ord',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'user',
      });

      expect(conn).toBe(
        'postgresql://user:p%40ss%3Aw%2Ford@localhost:5432/mydb',
      );
    });
  });

  describe('when required env vars are missing', () => {
    it('throws for an empty env', () => {
      expect(() => getPostgresUrl({})).toThrow(POSTGRES_URL_MISSING_ERROR);
    });

    it('throws when POSTGRES_* pieces are incomplete', () => {
      expect(() =>
        getPostgresUrl({
          POSTGRES_HOST: 'localhost',
          POSTGRES_USER: 'user',
        }),
      ).toThrow(POSTGRES_URL_MISSING_ERROR);
    });

    it('throws when POSTGRES_PORT is invalid', () => {
      expect(() =>
        getPostgresUrl({
          POSTGRES_DB: 'mydb',
          POSTGRES_HOST: 'localhost',
          POSTGRES_PASSWORD: 'secret',
          POSTGRES_PORT: 'not-a-number',
          POSTGRES_USER: 'user',
        }),
      ).toThrow(POSTGRES_URL_MISSING_ERROR);
    });
  });
});

describe('getCmsPostgresUrl', () => {
  describe('when CMS_POSTGRES_URL is set', () => {
    it('returns it verbatim, ignoring the primary connection', () => {
      const result = getCmsPostgresUrl({
        [CMS_POSTGRES_DB_ENV]: 'ignored',
        [CMS_POSTGRES_URL_ENV]: '  postgresql://cms@cms.example:5432/content  ',
        POSTGRES_URL: 'postgresql://user:pass@localhost:5432/openthrottle',
      });

      expect(result).toEqual({
        ok: true,
        url: 'postgresql://cms@cms.example:5432/content',
      });
    });
  });

  describe('when only the primary connection is set', () => {
    it('swaps the database for the default cms name', () => {
      const result = getCmsPostgresUrl({
        POSTGRES_URL: 'postgresql://user:pass@localhost:5432/openthrottle',
      });

      expect(result).toEqual({
        ok: true,
        url: `postgresql://user:pass@localhost:5432/${CMS_DEFAULT_DATABASE_NAME}`,
      });
    });

    it('uses CMS_POSTGRES_DB when set', () => {
      const result = getCmsPostgresUrl({
        [CMS_POSTGRES_DB_ENV]: 'cms_worktree',
        POSTGRES_DB: 'openthrottle',
        POSTGRES_HOST: 'localhost',
        POSTGRES_PASSWORD: 'secret',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'user',
      });

      expect(result).toEqual({
        ok: true,
        url: 'postgresql://user:secret@localhost:5432/cms_worktree',
      });
    });

    it('derives from OPENTHROTTLE_POSTGRES_URL first, like getPostgresUrl', () => {
      const result = getCmsPostgresUrl({
        [OPENTHROTTLE_POSTGRES_URL_ENV]: 'postgresql://ot@db.example:5432/ot',
        POSTGRES_URL: 'postgresql://foreign@localhost:5432/wrong_db',
      });

      expect(result).toEqual({
        ok: true,
        url: 'postgresql://ot@db.example:5432/cms',
      });
    });
  });

  describe('when no connection is configured', () => {
    it('returns an error result instead of throwing', () => {
      const result = getCmsPostgresUrl({});

      expect(result).toEqual({ error: POSTGRES_URL_MISSING_ERROR, ok: false });
    });
  });

  describe('when the primary URL cannot be parsed', () => {
    it('returns an error result', () => {
      const result = getCmsPostgresUrl({ POSTGRES_URL: 'not a url' });

      expect(result.ok).toBe(false);
    });
  });
});
