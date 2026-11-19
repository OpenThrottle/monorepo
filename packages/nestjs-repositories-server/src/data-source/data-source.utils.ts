import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import type { DataSourceOptions } from 'typeorm';

import { OPENTHROTTLE_ENTITIES } from './data-source.constants.ts';

/**
 * @description Resolves a positive integer from an env var, or undefined when
 * unset, blank or invalid. Used for the optional slow-query threshold.
 */
function parsePositiveIntEnv(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === '') {
    return undefined;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

/**
 * @description TypeORM DataSource options for the openthrottle database, from
 * POSTGRES_URL or the POSTGRES_* env vars. The server registers its default
 * DataSource with these (plus `autoLoadEntities`), and scripts that open a
 * DataSource directly pass them to `new DataSource(…)`.
 *
 * Full SQL logging stays off. In any env, setting `POSTGRES_SLOW_QUERY_MS` to a
 * positive integer sets `maxQueryExecutionTime`, so TypeORM logs a `query is
 * slow` warning for queries over the threshold (emitted independently of the
 * `logging` level): a production-safe hook for latency investigations.
 *
 * Reads `env` (default `process.env`), like `getCmsTypeOrmOptions`, so a test
 * passes its own variables instead of stubbing the process environment.
 * @public
 */
export function getOpenThrottleTypeOrmOptions(
  env: NodeJS.ProcessEnv = process.env,
): DataSourceOptions {
  const slowQueryMs = parsePositiveIntEnv(env.POSTGRES_SLOW_QUERY_MS);

  return {
    entities: [...OPENTHROTTLE_ENTITIES],
    logger: 'advanced-console',
    logging: ['error', 'warn', 'info'],
    ...(slowQueryMs != null && { maxQueryExecutionTime: slowQueryMs }),
    type: 'postgres',
    url: getPostgresUrl(env),
  };
}
