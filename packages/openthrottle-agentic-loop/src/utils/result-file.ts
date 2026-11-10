import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  RESULT_DIR_GITIGNORE,
  RESULT_DIR_NAME,
  RESULT_FILE_NAME,
} from '../data/data.constants.ts';

const resultFilePath = (worktreeRoot: string): string => {
  return join(worktreeRoot, RESULT_DIR_NAME, RESULT_FILE_NAME);
};

/**
 * @description Creates `.ot-loop/` with a self-ignoring `.gitignore` of `*` (§ 5).
 * @public
 */
export const prepareResultDir = async (worktreeRoot: string): Promise<void> => {
  const dir = join(worktreeRoot, RESULT_DIR_NAME);

  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, '.gitignore'), RESULT_DIR_GITIGNORE, 'utf8');
};

/**
 * @description Deletes any existing result file; run before every attempt.
 * @public
 */
export const clearResultFile = async (worktreeRoot: string): Promise<void> => {
  await rm(resultFilePath(worktreeRoot), { force: true });
};

/**
 * @description Reads the result file (`undefined` when absent), then deletes it.
 * @public
 */
export const readResultFile = async (
  worktreeRoot: string,
): Promise<string | undefined> => {
  const path = resultFilePath(worktreeRoot);

  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }

    throw error;
  } finally {
    await rm(path, { force: true });
  }
};
