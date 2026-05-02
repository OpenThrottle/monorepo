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
  // private logger: typeof logger;

  // constructor(readonly name?: string) {
  //   // this.logger = getLogger();
  //
  //   logger.info(`LoggerService initialized for ${name}`);
  // }

  fatal(message: any, ...optionalParams: any[]) {
    logger.error(message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    logger.error(message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    logger.warn(message, optionalParams);
  }

  debug(message: any, ...optionalParams: any[]) {
    logger.debug(message, optionalParams);
  }

  info(message: any, ...optionalParams: any[]) {
    logger.info(message, optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]) {
    logger.verbose(message, optionalParams);
  }

  /**
   * @deprecated Use `info` instead.
   */
  log(message: any, ...optionalParams: any[]) {
    logger.info(message, optionalParams);
  }
}
