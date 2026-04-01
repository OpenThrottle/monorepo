import { format } from 'winston';
import { TransformableInfo } from 'logform';

const formatColors = format.colorize({
  all: true,
  colors: { debug: 'blue', info: 'white' },
  level: false,
  message: false,
});

/**
 * @description We have a few flavors of log formatters, some are more concise
 * and others are more verbose, more useful for debugging.
 */
export const formatters: Record<string, ReturnType<typeof format.combine>> = {
  compact: format.combine(
    format.errors({ stack: true }),
    format.timestamp(),
    format.printf(({ level, message, ...rest }: TransformableInfo) => {
      const data = JSON.stringify(rest);
      const pid = process.pid;
      // const memory = process.memoryUsage();
      // const memoryUsage = `${memory.heapUsed / 1024 / 1024} MB`;

      // return `${timestamp} [${level}]: ${message} \n${data}\n`;
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

  production: format.combine(
    format.errors({ stack: true }),
    // format.timestamp(),
    format.json(),
  ),

  testing: format.combine(
    format.simple(),
    // format.errors({ stack: true }),
    // format.prettyPrint(),
    // format.json(),
    // format.label(),
    // format.metadata({
    //   fillExcept: ['service', 'level', '0'],
    // }),
    // format.timestamp(),
    formatColors,
  ),
};
