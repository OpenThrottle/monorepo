import { describe, expect, test } from 'vitest';

import { BANNED_FOLDER_NAMES } from '../config/folder-vocabulary';
import {
  assertFolderVocabulary,
  describeBannedFolder,
} from './folder-vocabulary';

describe('assertFolderVocabulary', () => {
  test('throws with the replacement hint and a machine-readable code', () => {
    expect(() => assertFolderVocabulary('folder', 'routing/plans/lib')).toThrow(
      /junk-drawer[\s\S]*Hint: use utils\/[\s\S]*"code":"banned_folder_name"/,
    );
  });

  test('points shared/common at the promotion ladder', () => {
    expect(() => assertFolderVocabulary('name', 'shared')).toThrow(
      /promotion ladder/,
    );
  });

  test('matches whole segments only, anywhere in the path', () => {
    expect(() => assertFolderVocabulary('folder', 'common')).toThrow(
      /"common"/,
    );
    expect(() =>
      assertFolderVocabulary('folder', 'routing/library'),
    ).not.toThrow();
    expect(() =>
      assertFolderVocabulary('folder', 'routing/shared-state'),
    ).not.toThrow();
  });

  test('accepts a clean path and an absent option', () => {
    expect(() =>
      assertFolderVocabulary('folder', 'routing/plans/utils'),
    ).not.toThrow();
    expect(() => assertFolderVocabulary('folder', undefined)).not.toThrow();
  });
});

describe('describeBannedFolder', () => {
  test('names the replacement and the skill', () => {
    expect(describeBannedFolder('misc')).toContain(BANNED_FOLDER_NAMES.misc);
    expect(describeBannedFolder('misc')).toContain('ot-folders');
  });
});
