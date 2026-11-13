import { PostgresProfilingQueryLogger } from '@openthrottle/nestjs-postgres';
import { describe, expect, it } from 'vitest';

import { CMS_CONNECTION } from './config/config.constants.ts';
import { getCmsTypeOrmOptions } from './nestjs-repositories-cms.utils.ts';

const PRIMARY_URL = 'postgresql://user:pass@localhost:5432/openthrottle';

describe('getCmsTypeOrmOptions', () => {
  describe('when a connection is configured', () => {
    it('targets the named cms connection with schema sync off', () => {
      const result = getCmsTypeOrmOptions({ POSTGRES_URL: PRIMARY_URL });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.options).toMatchObject({
        migrations: [],
        migrationsRun: false,
        name: CMS_CONNECTION,
        synchronize: false,
        type: 'postgres',
        url: 'postgresql://user:pass@localhost:5432/cms',
      });
    });

    it('logs through the postgres profiling query logger', () => {
      const result = getCmsTypeOrmOptions({ POSTGRES_URL: PRIMARY_URL });

      expect(result.ok && result.options.logger).toBeInstanceOf(
        PostgresProfilingQueryLogger,
      );
    });

    it('sets maxQueryExecutionTime from POSTGRES_SLOW_QUERY_MS', () => {
      const result = getCmsTypeOrmOptions({
        POSTGRES_SLOW_QUERY_MS: '250',
        POSTGRES_URL: PRIMARY_URL,
      });

      expect(result.ok && result.options.maxQueryExecutionTime).toBe(250);
    });

    it('ignores an invalid POSTGRES_SLOW_QUERY_MS', () => {
      const result = getCmsTypeOrmOptions({
        POSTGRES_SLOW_QUERY_MS: 'soon',
        POSTGRES_URL: PRIMARY_URL,
      });

      expect(result.ok && result.options.maxQueryExecutionTime).toBe(undefined);
    });
  });

  describe('when no connection is configured', () => {
    it('returns an error result that names the variables to set', () => {
      const result = getCmsTypeOrmOptions({});

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error).toMatch(/CMS_POSTGRES_URL/);
    });
  });
});
