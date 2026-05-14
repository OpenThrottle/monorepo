import * as path from 'node:path';
import type { ResolvedNestjsLoggingModuleOptions } from '../config/nestjs-logging.options';

const utcDateStamp = (): string => new Date().toISOString().slice(0, 10);

/**
 * @description Active JSONL file name (under {@link ResolvedNestjsLoggingModuleOptions.logDirectory}) for the current options and clock; must match {@link FileLogJsonlSink} naming.
 */
export const getActiveJsonlRelativePath = (
  options: ResolvedNestjsLoggingModuleOptions,
): string => {
  const rotation = options.rotation;

  if (rotation.type === 'daily') {
    return `${options.fileBasename}.${utcDateStamp()}.jsonl`;
  }

  if (options.fileNamePattern !== undefined) {
    return path.basename(options.fileNamePattern);
  }

  return `${options.fileBasename}.jsonl`;
};
