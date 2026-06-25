import * as Transport from 'winston-transport';
import { createLogger, format, Logger, transports } from 'winston';
import { formatters, isFormatterName } from './logger.formatters';

const isProduction = process.env.NODE_ENV === 'production';
const formatterEnv = process.env.LOG_FORMAT;
const formatterDefault = isProduction
  ? formatters.production
  : formatters.development;

if (formatterEnv && !isFormatterName(formatterEnv)) {
  // Surface misconfigured LOG_FORMAT (e.g. a typo like `prodction`) instead of
  // silently falling back to the env default.
  console.warn(
    `[LoggerService] Unknown LOG_FORMAT="${formatterEnv}"; falling back to the ${
      isProduction ? 'production' : 'development'
    } formatter.`,
  );
}

const activeFormat: ReturnType<typeof format.combine> =
  formatterEnv && isFormatterName(formatterEnv)
    ? formatters[formatterEnv]
    : formatterDefault;

const transportConsole = new transports.Console({
  format: activeFormat,
  handleExceptions: true,
  handleRejections: true,
  level: isProduction ? 'info' : 'debug',
});

const loggerTransports: Transport[] = [transportConsole];

/**
 * @description Allows us to create a logger instance with a name.
 *
 * No logger-level `format` is set: formatting is owned by each transport (the
 * Console transport above picks dev/prod/`LOG_FORMAT`). Previously this
 * hardcoded `formatters.production`, which was effectively dead (the Console
 * transport's own format wins) and misleading, since any second transport
 * would have silently inherited production JSON.
 */
export const getLogger = (name?: string): Logger => {
  const loggerInstance = createLogger({
    defaultMeta: {
      service: process.env.APP_NAME || '__UNKNOWN_SERVICE__',
    },
    exitOnError: false,
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
