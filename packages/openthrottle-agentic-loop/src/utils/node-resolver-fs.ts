import { access, readFile } from 'node:fs/promises';

import type { ResolverFs } from '../contract/index.ts';

const isNotFound = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
};

/**
 * @description `ResolverFs` over `node:fs/promises`.
 * @public
 */
export const nodeResolverFs: ResolverFs = {
  exists: async (path) => {
    try {
      await access(path);

      return true;
    } catch {
      return false;
    }
  },
  readFile: async (path) => {
    try {
      return await readFile(path, 'utf8');
    } catch (error) {
      if (isNotFound(error)) {
        return undefined;
      }

      throw error;
    }
  },
};
