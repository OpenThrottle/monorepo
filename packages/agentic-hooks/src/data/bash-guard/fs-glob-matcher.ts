/**
 * The real {@link GlobMatcher}: walk the filesystem to answer whether a zsh
 * filename pattern matches at least one path.
 *
 * Supports what zsh expands by default — `*`, `?`, `[…]` (with `!`/`^`
 * negation), `**` as a whole path segment, and backslash escapes — and, like
 * zsh without `GLOB_DOTS`, a wildcard never matches a leading dot.
 *
 * Bounded twice: by the number of directory entries it reads and by wall-clock
 * time. Hitting either bound, or any error other than "no such path", answers
 * `true` ("matches"), so the rule that asked fails open.
 *
 * @public
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import type { GlobMatcher } from './types.ts';

/** @public */
export const FS_GLOB_MAX_ENTRIES = 5000;
/** @public */
export const FS_GLOB_TIMEOUT_MS = 750;

/** @public */
export interface FsGlobMatcherOptions {
  readonly maxEntries: number;
  readonly timeoutMs: number;
}

class GlobBudgetExceeded extends Error {}

const GLOB_CHARS = /(^|[^\\])[*?[]/;

const escapeRegex = (char: string): string => {
  return /[\\^$.*+?()[\]{}|/]/.test(char) ? `\\${char}` : char;
};

/**
 * A regular expression for one path segment of a zsh glob, or null when the
 * segment holds no unescaped glob character (it is a literal name).
 *
 * @public
 */
export const globSegmentToRegExp = (segment: string): RegExp | null => {
  if (!GLOB_CHARS.test(segment)) return null;
  let source = '';
  let index = 0;
  while (index < segment.length) {
    const char = segment.charAt(index);
    if (char === '\\' && index + 1 < segment.length) {
      source += escapeRegex(segment.charAt(index + 1));
      index += 2;
      continue;
    }
    if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else if (char === '[') {
      const close = segment.indexOf(']', index + 2);
      if (close === -1) {
        source += '\\[';
      } else {
        let body = segment.slice(index + 1, close);
        const negated = body.startsWith('!') || body.startsWith('^');
        if (negated) body = body.slice(1);
        source += `[${negated ? '^' : ''}${body.replace(/\\/g, '\\\\')}]`;
        index = close;
      }
    } else {
      source += escapeRegex(char);
    }
    index += 1;
  }
  return new RegExp(`^${source}$`);
};

/** Split a pattern at unescaped slashes. */
const splitSegments = (pattern: string): readonly string[] => {
  const segments: string[] = [];
  let current = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern.charAt(index);
    if (char === '\\' && index + 1 < pattern.length) {
      current += char + pattern.charAt(index + 1);
      index += 1;
    } else if (char === '/') {
      segments.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  segments.push(current);
  return segments;
};

const unescape = (segment: string): string => {
  return segment.replace(/\\(.)/g, '$1');
};

const isMissing = (err: unknown): boolean => {
  const code =
    err instanceof Error && 'code' in err ? String(err.code) : undefined;
  return code === 'ENOENT' || code === 'ENOTDIR';
};

/**
 * Whether `pattern`, resolved against `cwd`, matches anything. Throws
 * {@link GlobBudgetExceeded} past `maxEntries` directory entries.
 */
const globHasMatch = async (
  pattern: string,
  cwd: string,
  maxEntries: number,
): Promise<boolean> => {
  let budget = maxEntries;
  const readDir = async (
    dir: string,
  ): Promise<readonly { readonly isDir: boolean; readonly name: string }[]> => {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      budget -= entries.length;
      if (budget < 0) throw new GlobBudgetExceeded();
      return entries.map((entry) => {
        return { isDir: entry.isDirectory(), name: entry.name };
      });
    } catch (err) {
      if (isMissing(err)) return [];
      throw err;
    }
  };

  const isAbsolute = pattern.startsWith('/');
  const segments = splitSegments(isAbsolute ? pattern.slice(1) : pattern);
  let dirs: readonly string[] = [isAbsolute ? '/' : cwd];

  // Each segment narrows the directories the next one reads, so the walk is
  // sequential by nature.
  for (const [index, segment] of segments.entries()) {
    const isLast = index === segments.length - 1;
    if (segment === '' || segment === '.') continue;
    if (segment === '**') {
      // `**/` matches zero or more directories, never dot-directories.
      const all: string[] = [];
      let frontier = dirs;
      while (frontier.length > 0) {
        all.push(...frontier);
        // eslint-disable-next-line no-await-in-loop -- breadth-first walk: each level needs the previous one
        const listed = await Promise.all(frontier.map(readDir));
        frontier = listed.flatMap((entries, at) => {
          const parent = frontier[at] ?? '';
          return entries
            .filter((entry) => entry.isDir && !entry.name.startsWith('.'))
            .map((entry) => path.join(parent, entry.name));
        });
      }
      dirs = all;
      continue;
    }

    const regex = globSegmentToRegExp(segment);
    if (regex === null) {
      const name = unescape(segment);
      const candidates = dirs.map((dir) => path.join(dir, name));
      // eslint-disable-next-line no-await-in-loop -- segments are sequential (see above)
      const stats = await Promise.all(
        candidates.map(async (candidate) => {
          try {
            return await fs.stat(candidate);
          } catch (err) {
            if (isMissing(err)) return null;
            throw err;
          }
        }),
      );
      dirs = candidates.filter((_, at) => {
        const stat = stats[at];
        return (
          stat !== null && stat !== undefined && (isLast || stat.isDirectory())
        );
      });
    } else {
      const allowDot = segment.startsWith('.');
      // eslint-disable-next-line no-await-in-loop -- segments are sequential (see above)
      const listed = await Promise.all(dirs.map(readDir));
      dirs = listed.flatMap((entries, at) => {
        const parent = dirs[at] ?? '';
        return entries
          .filter((entry) => isLast || entry.isDir)
          .filter((entry) => allowDot || !entry.name.startsWith('.'))
          .filter((entry) => regex.test(entry.name))
          .map((entry) => path.join(parent, entry.name));
      });
    }
    if (dirs.length === 0) return false;
  }
  return dirs.length > 0;
};

/**
 * A bounded filesystem {@link GlobMatcher}.
 *
 * @public
 */
export const createFsGlobMatcher = (
  options: FsGlobMatcherOptions = {
    maxEntries: FS_GLOB_MAX_ENTRIES,
    timeoutMs: FS_GLOB_TIMEOUT_MS,
  },
): GlobMatcher => {
  return async (pattern, cwd) => {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => {
        resolve(true);
      }, options.timeoutMs);
    });
    const walk = globHasMatch(pattern, cwd, options.maxEntries).catch(() => {
      return true;
    });
    try {
      return await Promise.race([walk, timeout]);
    } finally {
      clearTimeout(timer);
    }
  };
};
