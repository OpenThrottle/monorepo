import * as Transport from 'winston-transport';
import { createLogger, Logger, transports } from 'winston';
import { formatters } from './logger.formatters';

const isProduction = process.env.NODE_ENV === 'production';
const formatterEnv = process.env.LOG_FORMAT;
const formatterDefault = isProduction
  ? formatters.production
  : formatters.development;

const transportConsole = new transports.Console({
  format:
    formatterEnv && formatters[formatterEnv]
      ? formatters[formatterEnv]
      : formatterDefault,
  handleExceptions: true,
  handleRejections: true,
  level: isProduction ? 'info' : 'debug',
});

const loggerTransports: Transport[] = [transportConsole];

/**
 * @description Allows us to create a logger instance with a name.
 */
export const getLogger = (name?: string): Logger => {
  const loggerInstance = createLogger({
    defaultMeta: {
      service: process.env.APP_NAME || '__UNKNOWN_SERVICE__',
    },
    exitOnError: false,
    format: formatters.production,
    level: isProduction ? 'info' : 'debug',
    transports: loggerTransports,
  });

  if (name) {
    loggerInstance.defaultMeta.name = name;
    return loggerInstance.child({ name });
  }

  return loggerInstance;
};

/**
 * @description Export our logger configured for production or development
 * according to the environment.
 */
export const logger = getLogger();
