import { describe, expect, it } from 'vitest';

import {
  getPostgresUrl,
  OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV,
} from '../postgres.js';

describe('getPostgresUrl', () => {
  describe('when OPENTHROTTLE_CORTEX_POSTGRES_URL is set', () => {
    it('prefers OPENTHROTTLE_CORTEX_POSTGRES_URL over POSTGRES_URL', () => {
      const conn = getPostgresUrl({
        [OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]:
          'postgresql://cortex@db.example:5432/openthrottle',
        POSTGRES_URL: 'postgresql://foreign@localhost:5432/wrong_db',
      });

      expect(conn).toBe('postgresql://cortex@db.example:5432/openthrottle');
    });

    it('trims whitespace from OPENTHROTTLE_CORTEX_POSTGRES_URL', () => {
      const conn = getPostgresUrl({
        [OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]:
          '  postgresql://cortex@db.example:5432/openthrottle  ',
      });

      expect(conn).toBe('postgresql://cortex@db.example:5432/openthrottle');
    });
  });

  describe('when POSTGRES_URL is set', () => {
    it('returns POSTGRES_URL when cortex url is absent', () => {
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

    it('falls through empty OPENTHROTTLE_CORTEX_POSTGRES_URL to POSTGRES_URL', () => {
      const conn = getPostgresUrl({
        [OPENTHROTTLE_CORTEX_POSTGRES_URL_ENV]: '   ',
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
    it('returns undefined for an empty env', () => {
      expect(getPostgresUrl({})).toBeUndefined();
    });

    it('returns undefined when POSTGRES_* pieces are incomplete', () => {
      expect(
        getPostgresUrl({
          POSTGRES_HOST: 'localhost',
          POSTGRES_USER: 'user',
        }),
      ).toBeUndefined();
    });

    it('returns undefined when POSTGRES_PORT is invalid', () => {
      expect(
        getPostgresUrl({
          POSTGRES_DB: 'mydb',
          POSTGRES_HOST: 'localhost',
          POSTGRES_PASSWORD: 'secret',
          POSTGRES_PORT: 'not-a-number',
          POSTGRES_USER: 'user',
        }),
      ).toBeUndefined();
    });
  });
});
