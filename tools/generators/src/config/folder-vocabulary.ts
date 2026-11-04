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
export const FOLDER_VOCABULARY_SKILL_POINTER =
  'skills/ot-folders/SKILL.md (rule 4, "No junk-drawer folder names")';

const UTILS_CONFIG_DATA =
  'utils/ (pure functions), config/ (constants, defaults) or data/ (static data); reusable library code is a package';
const PROMOTION_LADDER =
  'the promotion ladder: app/global/ within one app, then a package across apps';

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
