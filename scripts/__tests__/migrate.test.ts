import { describe, expect, test } from 'vitest';

import { resolvePostgresUrl } from '../../databases/migrate.ts';

const PIECES = {
  POSTGRES_DB: 'openthrottle',
  POSTGRES_HOST: 'postgres',
  POSTGRES_PASSWORD: 'p@ss word',
  POSTGRES_PORT: '5432',
  POSTGRES_USER: 'ot',
};

describe('resolvePostgresUrl (container entrypoint)', () => {
  test('prefers OPENTHROTTLE_POSTGRES_URL over everything else', () => {
    expect(
      resolvePostgresUrl({
        ...PIECES,
        OPENTHROTTLE_POSTGRES_URL: ' postgresql://ot-url ',
        POSTGRES_URL: 'postgresql://pg-url',
      }),
    ).toBe('postgresql://ot-url');
  });

  test('falls back to POSTGRES_URL before the pieces', () => {
    expect(
      resolvePostgresUrl({ ...PIECES, POSTGRES_URL: 'postgresql://pg-url' }),
    ).toBe('postgresql://pg-url');
  });

  test('builds from POSTGRES_* pieces, URL-encoding the password', () => {
    expect(resolvePostgresUrl(PIECES)).toBe(
      'postgresql://ot:p%40ss%20word@postgres:5432/openthrottle',
    );
  });

  test('throws when neither a URL nor every piece is set', () => {
    expect(() =>
      resolvePostgresUrl({ ...PIECES, POSTGRES_PORT: undefined }),
    ).toThrow(/Required Postgres environment variables/);
  });
});
