import { extname } from 'node:path';

import { NATIVE_EXTENSIONS, SCRIPT_EXTENSIONS } from '../data/data.stage.ts';

export interface StagedEntry {
  /** The `stat` mode bits. */
  readonly mode: number;
  readonly path: string;
}

const EXECUTABLE_BITS = 0o111;

/**
 * @description Finds files asar cannot execute in place: native modules and
 * shared libraries by extension, and any executable file that is not a script.
 * Each one must be listed in `asarUnpack`, or the app cannot load it.
 */
export const findNativeFiles = (
  entries: readonly StagedEntry[],
): readonly string[] => {
  return entries
    .filter((entry) => {
      const ext = extname(entry.path);
      const isNative = NATIVE_EXTENSIONS.some((native) => native === ext);
      const isScript = SCRIPT_EXTENSIONS.some((script) => script === ext);
      const isExecutable = (entry.mode & EXECUTABLE_BITS) !== 0;

      return isNative || (isExecutable && !isScript);
    })
    .map((entry) => entry.path)
    .sort();
};
