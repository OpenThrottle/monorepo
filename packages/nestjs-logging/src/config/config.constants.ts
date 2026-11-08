import type { NestjsLoggingLevel } from './config.types.ts';

/**
 * @description Levels aligned with Nest `LoggerService` / `Logger.log` signatures.
 */
export const NESTJS_LOGGING_LEVELS = {
  debug: 'debug',
  error: 'error',
  fatal: 'fatal',
  log: 'log',
  verbose: 'verbose',
  warn: 'warn',
} as const;
export const ALL_NESTJS_LOGGING_LEVELS: ReadonlyArray<NestjsLoggingLevel> = [
  NESTJS_LOGGING_LEVELS.verbose,
  NESTJS_LOGGING_LEVELS.debug,
  NESTJS_LOGGING_LEVELS.log,
  NESTJS_LOGGING_LEVELS.warn,
  NESTJS_LOGGING_LEVELS.error,
  NESTJS_LOGGING_LEVELS.fatal,
];
export const PACKAGE_NAME = '@openthrottle/nestjs-logging';
