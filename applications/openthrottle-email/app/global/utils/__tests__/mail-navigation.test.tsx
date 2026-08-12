import { describe, expect, test } from 'vitest';
import {
  getNavIcon,
  getPath,
  normalizePath,
  pathToFolderId,
} from '../mail-navigation';
import { MAIL_PATHS } from '~/global/data/data.navigation';
import { MAIL_FOLDER_IDS } from '~/types/mail';

describe('normalizePath', () => {
  test('strips a trailing slash', () => {
    expect(normalizePath('/mail/')).toBe('/mail');
  });

  test('leaves a path without a trailing slash unchanged', () => {
    expect(normalizePath('/mail/sent')).toBe('/mail/sent');
  });

  test('normalizes the root path to "/"', () => {
    expect(normalizePath('/')).toBe('/');
  });
});

describe('getPath', () => {
  test('returns a string `to` unchanged', () => {
    expect(getPath('/mail/sent')).toBe('/mail/sent');
  });

  test('extracts pathname from a partial location object', () => {
    expect(getPath({ pathname: '/mail/drafts' })).toBe('/mail/drafts');
  });

  test('falls back to "/" when pathname is missing', () => {
    expect(getPath({})).toBe('/');
  });
});

describe('getNavIcon', () => {
  test('resolves an icon for each known mail path', () => {
    expect(getNavIcon(MAIL_PATHS.inbox)).toBeDefined();
    expect(getNavIcon(MAIL_PATHS.sent)).toBeDefined();
    expect(getNavIcon(MAIL_PATHS.drafts)).toBeDefined();
    expect(getNavIcon(MAIL_PATHS.trash)).toBeDefined();
    expect(getNavIcon(MAIL_PATHS.search)).toBeDefined();
    expect(getNavIcon(MAIL_PATHS.compose)).toBeDefined();
    expect(getNavIcon('/settings')).toBeDefined();
  });

  test('returns undefined for an unknown path', () => {
    expect(getNavIcon('/mail/unknown')).toBeUndefined();
  });
});

describe('pathToFolderId', () => {
  test('maps folder paths to their folder id', () => {
    expect(pathToFolderId(MAIL_PATHS.inbox)).toBe(MAIL_FOLDER_IDS.inbox);
    expect(pathToFolderId(MAIL_PATHS.sent)).toBe(MAIL_FOLDER_IDS.sent);
    expect(pathToFolderId(MAIL_PATHS.drafts)).toBe(MAIL_FOLDER_IDS.drafts);
    expect(pathToFolderId(MAIL_PATHS.trash)).toBe(MAIL_FOLDER_IDS.trash);
  });

  test('returns null for non-folder links (Compose, Settings)', () => {
    expect(pathToFolderId(MAIL_PATHS.compose)).toBeNull();
    expect(pathToFolderId('/settings')).toBeNull();
  });
});
