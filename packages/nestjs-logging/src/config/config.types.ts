import type { NESTJS_LOGGING_LEVELS } from './config.constants.ts';

export type NestjsLoggingLevel =
  (typeof NESTJS_LOGGING_LEVELS)[keyof typeof NESTJS_LOGGING_LEVELS];
