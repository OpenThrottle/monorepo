import type { format, Logger } from 'winston';
import { createLogger, transports } from 'winston';
import type * as Transport from 'winston-transport';

import { formatters } from './logger.constants.ts';
import type { FormatterName } from './logger.types.ts';

const formatterNames: readonly string[] = Object.keys(formatters);

/**
 * @description Type guard: is the given string a known formatter name?
 */
export const isFormatterName = (value: string): value is FormatterName => {
  return formatterNames.includes(value);
};

const isProduction = process.env.NODE_ENV === 'production';
const formatterEnv = process.env.LOG_FORMAT;
const defaultFormatterName = isProduction ? 'production' : 'development';
const formatterDefault = formatters[defaultFormatterName];

if (formatterEnv && !isFormatterName(formatterEnv)) {
  // Surface misconfigured LOG_FORMAT (e.g. a typo like `prodction`) instead of
  // silently falling back to the env default.
  console.warn(
    `[LoggerService] Unknown LOG_FORMAT="${formatterEnv}"; falling back to the ${defaultFormatterName} formatter.`,
  );
}

const resolveActiveFormat = (): ReturnType<typeof format.combine> => {
  if (formatterEnv && isFormatterName(formatterEnv)) {
    return formatters[formatterEnv];
  }
  return formatterDefault;
};

const activeFormat = resolveActiveFormat();

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
