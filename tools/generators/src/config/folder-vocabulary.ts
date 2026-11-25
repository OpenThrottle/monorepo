/**
 * The junk-drawer folder names banned by ot-folders rule 4, each mapped to what
 * to use instead. This is the ONE copy of the list: the generators validate
 * `--folder` / `--name` against it, and `scripts/check-folder-vocabulary.ts`
 * (pre-commit, check:local, CI) imports it from the package index.
 *
 * It lives here rather than in `@tools/dotfiles` because the pre-commit gate
 * imports it on every commit: loading `@tools/dotfiles` pulls in every ESLint
 * plugin (~3s), while this package's index costs ~0.2s.
 */

/** Where the rule, and the replacement for each name, is explained. */
export const FOLDER_VOCABULARY_SKILL_POINTER = `skills/ot-folders/SKILL.md (rule 4, "No junk-drawer folder names")`;

const UTILS_CONFIG_DATA = `utils/ (pure functions), config/ (constants, defaults) or data/ (static data); reusable library code is a package`;
const PROMOTION_LADDER = `the promotion ladder: app/global/ within one app, then a package across apps`;

/** Each banned directory name, mapped to what to use instead. */
export const BANNED_FOLDER_NAMES = {
  common: PROMOTION_LADDER,
  helpers: UTILS_CONFIG_DATA,
  lib: UTILS_CONFIG_DATA,
  misc: UTILS_CONFIG_DATA,
  shared: PROMOTION_LADDER,
} as const;

/** One of the banned directory names. */
export type BannedFolderName = keyof typeof BANNED_FOLDER_NAMES;

/**
 * @description The top-level `src/` folders each checked technology bucket may
 * carry, per the ot-folders "Technology buckets" table. `__tests__` and
 * `__generated__` are tooling folders, allowed in every bucket. nodejs also
 * allows `scripts`, for the thin CLI entry points a package's commands run. The `nestjs`
 * bucket has no entry: it is folder-per-unit (`<folder>.<kind>.ts`), so a
 * vocabulary would be wrong there, not merely strict.
 */
export const BUCKET_FOLDER_VOCABULARY = {
  nodejs: [
    '__generated__',
    '__tests__',
    'config',
    'data',
    'scripts',
    'types',
    'utils',
  ],
  react: [
    '__generated__',
    '__tests__',
    'components',
    'config',
    'data',
    'hooks',
    'types',
    'utils',
  ],
  'react-router': [
    '__generated__',
    '__tests__',
    'components',
    'config',
    'data',
    'hooks',
    'types',
    'utils',
  ],
} as const satisfies Readonly<Record<string, readonly string[]>>;

/**
 * @description The folders a checked project (any bucket in
 * {@link BUCKET_FOLDER_VOCABULARY}) may have at its root, beside `src/`.
 * Everything a package ships or runs lives under `src/` and follows its
 * bucket's vocabulary; these are the few roots that hold something else:
 * prose (`docs`), suites and their inputs (`tests`, `fixtures`), and build or
 * maintenance scripts that run outside the package's own code (`scripts`).
 * Applications are not checked, so their `public/`, `app/` and `e2e/` roots
 * need no entry. A new word needs a reason that no existing one fits.
 */
export const PROJECT_ROOT_FOLDERS = [
  'docs',
  'fixtures',
  'scripts',
  'src',
  'tests',
] as const;

/** A technology bucket whose top-level `src/` folders are checked. */
export type CheckedBucket = keyof typeof BUCKET_FOLDER_VOCABULARY;

/**
 * @description The folders that may sit directly below a vocabulary folder
 * (`src/utils/__tests__/`), in every checked bucket. Anything else one level
 * down is a feature folder, which ot-folders' "Below the top level, stay flat"
 * rule forbids: flatten it into subject-named modules, or promote it to a
 * package.
 */
export const NESTED_TOOLING_FOLDERS = ['__generated__', '__tests__'] as const;

/**
 * @description The vocabulary folder, per bucket, whose children may also be
 * one PascalCase folder per compound component (`components/Card/` holding
 * `Card.tsx`, `CardHeader.tsx`, …). nodejs has no components, so no entry.
 */
export const COMPOUND_COMPONENT_FOLDER: Readonly<
  Partial<Record<CheckedBucket, string>>
> = {
  react: 'components',
  'react-router': 'components',
};
