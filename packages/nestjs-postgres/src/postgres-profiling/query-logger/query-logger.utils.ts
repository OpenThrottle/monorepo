import type { Logger, LoggerOptions } from 'typeorm';
import {
  AdvancedConsoleLogger,
  FileLogger,
  FormattedConsoleLogger,
  SimpleConsoleLogger,
} from 'typeorm';

import type { PostgresProfilingInnerLoggerOption } from '../postgres-profiling.types.ts';
import { PostgresProfilingQueryLogger } from './postgres-profiling-query-logger.strategy.ts';

/**
 * @description Mirrors TypeORM's LoggerFactory, which is not exported. `debug`
 * (DebugLogger is not exported either) falls back to the default advanced console logger.
 */
export const resolveInnerLogger = (
  logger: PostgresProfilingInnerLoggerOption,
  logging: LoggerOptions,
): Logger => {
  if (typeof logger === 'object') {
    return logger;
  }

  switch (logger) {
    case 'file':
      return new FileLogger(logging);
    case 'formatted-console':
      return new FormattedConsoleLogger(logging);
    case 'simple-console':
      return new SimpleConsoleLogger(logging);

    default:
      return new AdvancedConsoleLogger(logging);
  }
};

/**
 * @public
 * @description Wraps the logger TypeORM would have used so queries are captured for profiling.
 */
export const createPostgresProfilingQueryLogger = (
  logger: PostgresProfilingInnerLoggerOption,
  logging: LoggerOptions,
): PostgresProfilingQueryLogger => {
  return new PostgresProfilingQueryLogger(resolveInnerLogger(logger, logging));
};
