import type { formatters } from './logger.constants.ts';
/**
 * @description The known formatter names. Use {@link isFormatterName} to
 * narrow an arbitrary `LOG_FORMAT` string before indexing {@link formatters}.
 */
export type FormatterName = keyof typeof formatters;
