/**
 * @description Enforces ot-folders rule 4 — no junk-drawer folder names. A
 * directory named `lib`, `helpers`, `common`, `shared` or `misc` says nothing
 * about what belongs in it, so it grows without bound, and every one left in
 * the tree is an example the next agent copies. The skill states the rule; this
 * makes it fail.
 *
 * Matching is by whole path **segment**, and only directory segments — never the
 * basename. `library.ts`, `common.ts` and a `@nestjs/common` import are all
 * fine; `src/lib/x.ts` is not. Each offending directory reports once, however
 * many files it holds.
 *
 * Two modes over one list:
 *
 *   - **Whole tree** (default) — `git ls-files`, so untracked scratch output and
 *     `node_modules` cannot produce findings nobody can act on. It also lists
 *     intent-to-add paths (`git add -N`), which is how to probe the check
 *     without committing anything. `check:local` and the CI `gates` job run this.
 *   - **`--staged`** — only paths the index adds or renames *to*
 *     (`git diff --cached --diff-filter=AR`). `.husky/pre-commit` runs this via
 *     `.husky/utils/folder-vocabulary-gate.sh`, so a commit is refused before CI
 *     has to say so. A rename *out of* a banned folder is the fix, so only the
 *     destination counts; modified files are the whole-tree check's business.
 *
 * Known limits:
 *
 *   - **Tracked files only.** An empty directory (or one holding only ignored
 *     files) is invisible to git and therefore to this check. That is fine in
 *     practice: an empty `lib/` has nothing in it to copy.
 *   - **Names, not intent.** A tool's own specific term is allowed even when it
 *     sounds generic, but only the five names in BANNED_FOLDER_NAMES are
 *     checked; a sixth vague name needs adding there deliberately.
 */
import type { BannedFolderName } from '@tools/generators';
import {
  BANNED_FOLDER_NAMES,
  FOLDER_VOCABULARY_SKILL_POINTER,
} from '@tools/generators';

import { createLogger, hasFlag, run } from './utils/index.ts';

const logger = createLogger();

// The banned names and their hints live in @tools/generators, which validates
// `--folder` / `--name` against the same list. Re-exported so this script's
// spec and callers have one import site.
export type { BannedFolderName };
export { BANNED_FOLDER_NAMES };

/** A path prefix exempt from the check, and why. */
export interface AllowlistEntry {
  /** Matched against the path with a `**` segment standing for any depth. */
  readonly pattern: string;
  readonly reason: string;
}

/**
 * Paths exempt from the check, each with the reason. Additions need a
 * defensible answer to "why is a vague name right here?" — never "it was
 * already there".
 */
export const ALLOWLIST: readonly AllowlistEntry[] = [
  {
    pattern: 'tools/generators/**/files/**',
    reason:
      "generator template input — the folder name is the generated output's, not ours",
  },
];

/** A directory carrying a banned segment, reported once per directory. */
export interface BannedFolderHit {
  /** What to use instead, from BANNED_FOLDER_NAMES. */
  readonly hint: string;
  /** The directory path, up to and including the banned segment. */
  readonly path: string;
  readonly segment: BannedFolderName;
}

const isBannedName = (segment: string): segment is BannedFolderName =>
  Object.hasOwn(BANNED_FOLDER_NAMES, segment);

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `a/**\/b/**` → a regex matching `a/<any depth>/b/<anything>`. */
const allowlistPattern = (pattern: string): RegExp => {
  const source = pattern
    .split('/')
    .map((segment) =>
      segment === '**' ? '(?:[^/]+/)*' : `${escapeRegExp(segment)}/`,
    )
    .join('');

  return new RegExp(`^${source}`);
};

const ALLOWLIST_PATTERNS = ALLOWLIST.map((entry) =>
  allowlistPattern(entry.pattern),
);

/** True when an allowlist entry covers the path. */
export const isAllowlisted = (path: string): boolean =>
  ALLOWLIST_PATTERNS.some((pattern) => pattern.test(path));

/**
 * Every directory in `paths` that carries a banned segment. The basename is
 * never checked — a file may be called `common.ts`. Nested hits
 * (`lib/helpers/x.ts`) report both directories; hits are deduped by directory
 * and sorted.
 */
export const findBannedFolders = (
  paths: readonly string[],
): BannedFolderHit[] => {
  const hits = new Map<string, BannedFolderHit>();

  for (const path of paths) {
    if (isAllowlisted(path)) {
      continue;
    }

    const directories = path.split('/').slice(0, -1);
    directories.forEach((segment, index) => {
      if (!isBannedName(segment)) {
        return;
      }

      const directory = directories.slice(0, index + 1).join('/');
      if (!hits.has(directory)) {
        hits.set(directory, {
          hint: BANNED_FOLDER_NAMES[segment],
          path: directory,
          segment,
        });
      }
    });
  }

  return [...hits.values()].sort((a, b) => a.path.localeCompare(b.path));
};

/** The failure line for one hit: the path, then what to use instead. */
export const formatHit = (hit: BannedFolderHit): string =>
  `  ${hit.path}/ — "${hit.segment}" is a junk-drawer name; use ${hit.hint}`;

const splitNulSeparated = (stdout: string): string[] =>
  stdout.split('\0').filter((path) => path !== '');

/** Every tracked path, including intent-to-add ones. */
export const listTrackedPaths = (cwd: string): string[] =>
  splitNulSeparated(run('git', ['ls-files', '-z'], { cwd }).stdout);

/** Paths the index adds, or renames to — never a rename's source. */
export const listStagedPaths = (cwd: string): string[] =>
  splitNulSeparated(
    run('git', ['diff', '--cached', '--name-only', '--diff-filter=AR', '-z'], {
      cwd,
    }).stdout,
  );

export const main = (
  cwd: string = process.cwd(),
  staged: boolean = hasFlag('staged'),
): number => {
  const paths = staged ? listStagedPaths(cwd) : listTrackedPaths(cwd);
  const hits = findBannedFolders(paths);
  const scope = staged ? 'staged added/renamed' : 'tracked';

  if (hits.length === 0) {
    logger.success(`Folder vocabulary: ${paths.length} ${scope} path(s), no junk-drawer folders`); // prettier-ignore

    return 0;
  }

  logger.fail(`${hits.length} folder(s) use a junk-drawer name (${Object.keys(BANNED_FOLDER_NAMES).join(', ')}):`); // prettier-ignore
  for (const hit of hits) {
    logger.info(formatHit(hit));
  }

  logger.blank();
  logger.info(`Rename the folder per ${FOLDER_VOCABULARY_SKILL_POINTER}.`);
  logger.info(
    'If a vague name is genuinely right, add an ALLOWLIST entry with',
  );
  logger.info('its reason in scripts/check-folder-vocabulary.ts.');

  return 1;
};

if (process.argv[1]?.endsWith('check-folder-vocabulary.ts')) {
  process.exit(main());
}
