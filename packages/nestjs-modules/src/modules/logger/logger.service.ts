import {
  Injectable,
  LoggerService as DefaultLoggerService,
} from '@nestjs/common';
import { logger } from './logger.config';

/**
 * @external https://docs.nestjs.com/techniques/logger
 * @external https://github.com/winstonjs/winston
 * @description We implement a custom logger service here in order to
 * use Winston and Datadog.
 */
@Injectable()
export class LoggerService implements DefaultLoggerService {
  /**
   * Winston has no `fatal` level, so fatal logs are emitted at `error`
   * level with a `severity: 'fatal'` meta marker to preserve the
   * distinction for downstream log processors (the reserved Winston
   * `level` field stays `error` so transports and level filters behave).
   */
  fatal(message: unknown, ...optionalParams: unknown[]) {
    logger.error(message, ...optionalParams, { severity: 'fatal' });
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    logger.error(message, ...optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    logger.warn(message, ...optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    logger.debug(message, ...optionalParams);
  }

  info(message: unknown, ...optionalParams: unknown[]) {
    logger.info(message, ...optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    logger.verbose(message, ...optionalParams);
  }

  /**
   * @deprecated Use `info` instead.
   */
  log(message: unknown, ...optionalParams: unknown[]) {
    logger.info(message, ...optionalParams);
  }
}
