import type { BannedFolderName } from '../config/folder-vocabulary';
import {
  BANNED_FOLDER_NAMES,
  FOLDER_VOCABULARY_SKILL_POINTER,
} from '../config/folder-vocabulary';
import { throwGeneratorError } from './generator-errors';

const BANNED_NAMES: readonly string[] = Object.keys(BANNED_FOLDER_NAMES);

/** True when a single path segment is one of the banned folder names. */
export const isBannedFolderName = (
  segment: string,
): segment is BannedFolderName => BANNED_NAMES.includes(segment);

/** The first banned segment in a `/`-separated folder path, if any. */
const findBannedSegment = (folder: string): BannedFolderName | undefined =>
  folder.split('/').find(isBannedFolderName);

/** The teaching message for a banned segment: what to use instead, and where the rule lives. */
export const describeBannedFolder = (segment: BannedFolderName): string =>
  `"${segment}" is a junk-drawer folder name; use ${BANNED_FOLDER_NAMES[segment]}. See ${FOLDER_VOCABULARY_SKILL_POINTER}.`;

/** Short note for `--describe` output, so agents see the restriction up front. */
export const FOLDER_VOCABULARY_RESTRICTION = `Must not contain a junk-drawer folder segment (${BANNED_NAMES.join(', ')}); see ${FOLDER_VOCABULARY_SKILL_POINTER}.`;

/**
 * Refuse a folder option containing a banned segment, via throwGeneratorError
 * so tooling can read the payload. A no-op for an absent option.
 */
export const assertFolderVocabulary = (
  field: string,
  folder: string | undefined,
): void => {
  if (folder === undefined) return;

  const segment = findBannedSegment(folder);
  if (segment === undefined) return;

  throwGeneratorError({
    code: 'banned_folder_name',
    field,
    hint: `use ${BANNED_FOLDER_NAMES[segment]}. See ${FOLDER_VOCABULARY_SKILL_POINTER}.`,
    message: `--${field}="${folder}" contains "${segment}", a junk-drawer folder name.`,
  });
};
