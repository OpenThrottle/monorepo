import { asMock } from '@openthrottle/nestjs-testing';
import type { Logger, QueryRunner } from 'typeorm';
import {
  AdvancedConsoleLogger,
  FormattedConsoleLogger,
  SimpleConsoleLogger,
} from 'typeorm';
import type { Mocked } from 'vitest';
import { describe, expect, it, vi } from 'vitest';

import { runWithQueryCapture } from '../query-capture/query-capture.utils.ts';
import { PostgresProfilingQueryLogger } from './postgres-profiling-query-logger.strategy.ts';
import {
  createPostgresProfilingQueryLogger,
  resolveInnerLogger,
} from './query-logger.utils.ts';

const buildInnerLogger = (): Mocked<Logger> => {
  return {
    log: vi.fn(),
    logMigration: vi.fn(),
    logQuery: vi.fn(),
    logQueryError: vi.fn(),
    logQuerySlow: vi.fn(),
    logSchemaBuild: vi.fn(),
  };
};

describe('PostgresProfilingQueryLogger', () => {
  describe('logQuery outside a capture scope', () => {
    it('forwards to the inner logger and captures nothing', async () => {
      const inner = buildInnerLogger();
      const logger = new PostgresProfilingQueryLogger(inner);

      logger.logQuery('SELECT 1', [1]);

      expect(inner.logQuery).toHaveBeenCalledWith('SELECT 1', [1], undefined);

      const { queries } = await runWithQueryCapture(() => undefined);

      expect(queries).toEqual([]);
    });
  });

  describe('logQuery inside a capture scope', () => {
    it('captures the query and still forwards it', async () => {
      const inner = buildInnerLogger();
      const logger = new PostgresProfilingQueryLogger(inner);

      const { queries } = await runWithQueryCapture(() => {
        logger.logQuery('SELECT $1', [7]);
      });

      expect(queries).toEqual([{ parameters: [7], query: 'SELECT $1' }]);
      expect(inner.logQuery).toHaveBeenCalledTimes(1);
    });

    it('isolates captures between concurrent scopes', async () => {
      const logger = new PostgresProfilingQueryLogger(buildInnerLogger());

      const [first, second] = await Promise.all([
        runWithQueryCapture(async () => {
          logger.logQuery('SELECT first');
          await new Promise((resolve) => setTimeout(resolve, 0));
          logger.logQuery('SELECT first_again');
        }),
        runWithQueryCapture(async () => {
          logger.logQuery('SELECT second');
        }),
      ]);

      expect(first.queries.map(({ query }) => query)).toEqual([
        'SELECT first',
        'SELECT first_again',
      ]);
      expect(second.queries.map(({ query }) => query)).toEqual([
        'SELECT second',
      ]);
    });

    it('does not capture EXPLAIN statements but forwards them', async () => {
      const inner = buildInnerLogger();
      const logger = new PostgresProfilingQueryLogger(inner);

      const { queries } = await runWithQueryCapture(() => {
        logger.logQuery('EXPLAIN SELECT 1');
      });

      expect(queries).toEqual([]);
      expect(inner.logQuery).toHaveBeenCalledWith(
        'EXPLAIN SELECT 1',
        undefined,
        undefined,
      );
    });
  });

  describe('other log calls', () => {
    const queryRunner = asMock<QueryRunner>({});

    it('delegates every one to the inner logger without capturing', async () => {
      const inner = buildInnerLogger();
      const logger = new PostgresProfilingQueryLogger(inner);

      const { queries } = await runWithQueryCapture(() => {
        logger.log('warn', 'message', queryRunner);
        logger.logMigration('migrating', queryRunner);
        logger.logQueryError('failed', 'SELECT 1', [1], queryRunner);
        logger.logQuerySlow(10, 'SELECT 1', [1], queryRunner);
        logger.logSchemaBuild('schema', queryRunner);
      });

      expect(queries).toEqual([]);
      expect(inner.log).toHaveBeenCalledWith('warn', 'message', queryRunner);
      expect(inner.logMigration).toHaveBeenCalledWith('migrating', queryRunner);
      expect(inner.logQueryError).toHaveBeenCalledWith(
        'failed',
        'SELECT 1',
        [1],
        queryRunner,
      );
      expect(inner.logQuerySlow).toHaveBeenCalledWith(
        10,
        'SELECT 1',
        [1],
        queryRunner,
      );
      expect(inner.logSchemaBuild).toHaveBeenCalledWith('schema', queryRunner);
    });
  });
});

describe('resolveInnerLogger', () => {
  describe('when the logger is an object', () => {
    it('returns it as-is', () => {
      const inner = buildInnerLogger();

      expect(resolveInnerLogger(inner, ['error'])).toBe(inner);
    });
  });

  describe('when the logger is undefined', () => {
    it('builds the TypeORM default advanced console logger', () => {
      expect(resolveInnerLogger(undefined, ['error'])).toBeInstanceOf(
        AdvancedConsoleLogger,
      );
    });
  });

  describe('when the logger is a supported string', () => {
    it('builds a simple console logger', () => {
      expect(resolveInnerLogger('simple-console', ['error'])).toBeInstanceOf(
        SimpleConsoleLogger,
      );
    });

    it('builds a formatted console logger', () => {
      expect(resolveInnerLogger('formatted-console', ['error'])).toBeInstanceOf(
        FormattedConsoleLogger,
      );
    });

    it('builds an advanced console logger', () => {
      expect(resolveInnerLogger('advanced-console', ['error'])).toBeInstanceOf(
        AdvancedConsoleLogger,
      );
    });
  });

  describe('when the logger is debug', () => {
    it('falls back to the advanced console logger', () => {
      expect(resolveInnerLogger('debug', ['error'])).toBeInstanceOf(
        AdvancedConsoleLogger,
      );
    });
  });

  describe('createPostgresProfilingQueryLogger', () => {
    it('wraps the resolved inner logger', async () => {
      const inner = buildInnerLogger();
      const logger = createPostgresProfilingQueryLogger(inner, ['error']);

      logger.logSchemaBuild('schema');

      expect(logger).toBeInstanceOf(PostgresProfilingQueryLogger);
      expect(inner.logSchemaBuild).toHaveBeenCalledWith('schema', undefined);
    });
  });
});
