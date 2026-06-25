import { format } from 'winston';
import { TransformableInfo } from 'logform';

const formatColors = format.colorize({
  all: true,
  colors: {
    debug: 'blue',
    // info: 'white'
  },
  level: false,
  message: false,
});

/**
 * @description We have a few flavors of log formatters, some are more concise
 * and others are more verbose, more useful for debugging.
 */
export const formatters = {
  compact: format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    format.printf(({ level, message, ...rest }: TransformableInfo) => {
      const data = JSON.stringify(rest);
      const pid = process.pid;

      return `[LoggerService] ${pid} ${level}: ${message} \n${data}\n`;
    }),
    formatColors,
  ),

  development: format.combine(
    format.errors({ stack: true }),
    format.json({ space: 2 }),
    formatColors,
  ),

  pretty: format.combine(
    format.errors({ stack: true }),
    format.prettyPrint(),
    formatColors,
  ),

  production: format.combine(format.errors({ stack: true }), format.json()),

  testing: format.combine(format.simple(), formatColors),
} as const;

/**
 * @description The known formatter names. Use {@link isFormatterName} to
 * narrow an arbitrary `LOG_FORMAT` string before indexing {@link formatters}.
 */
export type FormatterName = keyof typeof formatters;

const formatterNames = Object.keys(formatters) as FormatterName[];

/**
 * @description Type guard: is the given string a known formatter name?
 */
export const isFormatterName = (value: string): value is FormatterName =>
  formatterNames.includes(value as FormatterName);
