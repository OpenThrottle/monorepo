import { basename, extname } from 'node:path';

import {
  ENV_FILE_PREFIX,
  EXCLUDED_BASENAMES,
  EXCLUDED_EXTENSIONS,
} from '../data/data.stage.ts';

/** @description True for a `.env` or `.env.<anything>` file, in any folder. */
export const isEnvFile = (path: string): boolean => {
  const name = basename(path);

  return name === ENV_FILE_PREFIX || name.startsWith(`${ENV_FILE_PREFIX}.`);
};

/**
 * @description The stage allowlist's deny side. A `.env` file, repository
 * metadata, a placeholder or a source map is never copied. This is the one
 * place the `.env` invariant lives: the stage script also re-checks the
 * finished stage with it.
 */
export const isExcludedFile = (path: string): boolean => {
  const name = basename(path);

  if (isEnvFile(path)) {
    return true;
  }

  const isExcludedName = EXCLUDED_BASENAMES.some(
    (excluded) => excluded === name,
  );

  return (
    isExcludedName || EXCLUDED_EXTENSIONS.some((ext) => ext === extname(name))
  );
};
