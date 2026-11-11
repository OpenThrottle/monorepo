import type { Logger, QueryRunner } from 'typeorm';

import { captureQuery } from '../query-capture/query-capture.utils.ts';

/**
 * @public
 * @description Records queries into the active capture scope, then forwards
 * every call to the logger TypeORM would have used, so log output is unchanged.
 */
export class PostgresProfilingQueryLogger implements Logger {
  constructor(private readonly innerLogger: Logger) {}

  log(
    level: 'info' | 'log' | 'warn',
    message: unknown,
    queryRunner?: QueryRunner,
  ): void {
    this.innerLogger.log(level, message, queryRunner);
  }

  logMigration(message: string, queryRunner?: QueryRunner): void {
    this.innerLogger.logMigration(message, queryRunner);
  }

  logQuery(
    query: string,
    parameters?: unknown[],
    queryRunner?: QueryRunner,
  ): void {
    captureQuery({ parameters, query });
    this.innerLogger.logQuery(query, parameters, queryRunner);
  }

  logQueryError(
    error: Error | string,
    query: string,
    parameters?: unknown[],
    queryRunner?: QueryRunner,
  ): void {
    this.innerLogger.logQueryError(error, query, parameters, queryRunner);
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: unknown[],
    queryRunner?: QueryRunner,
  ): void {
    this.innerLogger.logQuerySlow(time, query, parameters, queryRunner);
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner): void {
    this.innerLogger.logSchemaBuild(message, queryRunner);
  }
}
