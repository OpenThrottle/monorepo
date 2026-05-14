import { beforeEach, describe, expect, test } from 'vitest';
import {
  RECENT_WORKSPACE_PATHS_STORAGE_KEY,
  RECENT_WORKSPACE_PATHS_MAX,
} from '~/routing/plans/config/defaults';
import {
  addRecentWorkspacePath,
  getRecentWorkspacePaths,
  removeRecentWorkspacePath,
  validateWorkspacePathClient,
} from '~/routing/plans/utils/workspace-path';

describe('validateWorkspacePathClient', () => {
  test('returns undefined for empty string', () => {
    expect(validateWorkspacePathClient('')).toBeUndefined();
    expect(validateWorkspacePathClient('   ')).toBeUndefined();
  });

  test('returns undefined for valid absolute path', () => {
    expect(
      validateWorkspacePathClient('/Users/matt/Development/my-project'),
    ).toBeUndefined();
  });

  test('returns error for relative path', () => {
    expect(validateWorkspacePathClient('relative/path')).toBe(
      'Path must be absolute (start with /)',
    );
  });

  test('returns error for path that is too long', () => {
    const longPath = '/' + 'a'.repeat(4096);
    expect(validateWorkspacePathClient(longPath)).toBe(
      'Path is too long (max 4096 characters)',
    );
  });

  test('returns error for path with null bytes', () => {
    expect(validateWorkspacePathClient('/some/path\0bad')).toBe(
      'Path contains invalid characters',
    );
  });
});

describe('getRecentWorkspacePaths', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns empty array when nothing stored', () => {
    expect(getRecentWorkspacePaths()).toEqual([]);
  });

  test('returns stored paths', () => {
    localStorage.setItem(
      RECENT_WORKSPACE_PATHS_STORAGE_KEY,
      JSON.stringify(['/path/a', '/path/b']),
    );

    expect(getRecentWorkspacePaths()).toEqual(['/path/a', '/path/b']);
  });

  test('filters out non-string values', () => {
    localStorage.setItem(
      RECENT_WORKSPACE_PATHS_STORAGE_KEY,
      JSON.stringify(['/path/a', 42, null, '', '/path/b']),
    );

    expect(getRecentWorkspacePaths()).toEqual(['/path/a', '/path/b']);
  });

  test('returns empty array for invalid JSON', () => {
    localStorage.setItem(RECENT_WORKSPACE_PATHS_STORAGE_KEY, 'not-json');

    expect(getRecentWorkspacePaths()).toEqual([]);
  });
});

describe('addRecentWorkspacePath', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('adds a path to the front', () => {
    addRecentWorkspacePath('/path/a');
    addRecentWorkspacePath('/path/b');

    expect(getRecentWorkspacePaths()).toEqual(['/path/b', '/path/a']);
  });

  test('deduplicates existing path by moving it to the front', () => {
    addRecentWorkspacePath('/path/a');
    addRecentWorkspacePath('/path/b');
    addRecentWorkspacePath('/path/a');

    expect(getRecentWorkspacePaths()).toEqual(['/path/a', '/path/b']);
  });

  test('caps at max entries', () => {
    for (let i = 0; i < RECENT_WORKSPACE_PATHS_MAX + 5; i++) {
      addRecentWorkspacePath(`/path/${i}`);
    }

    const result = getRecentWorkspacePaths();
    expect(result.length).toBe(RECENT_WORKSPACE_PATHS_MAX);
    expect(result[0]).toBe(`/path/${RECENT_WORKSPACE_PATHS_MAX + 4}`);
  });

  test('ignores empty strings', () => {
    addRecentWorkspacePath('');
    addRecentWorkspacePath('   ');

    expect(getRecentWorkspacePaths()).toEqual([]);
  });
});

describe('removeRecentWorkspacePath', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('removes a specific path', () => {
    addRecentWorkspacePath('/path/a');
    addRecentWorkspacePath('/path/b');
    addRecentWorkspacePath('/path/c');

    removeRecentWorkspacePath('/path/b');

    expect(getRecentWorkspacePaths()).toEqual(['/path/c', '/path/a']);
  });

  test('is a no-op for a path that does not exist', () => {
    addRecentWorkspacePath('/path/a');

    removeRecentWorkspacePath('/path/nonexistent');

    expect(getRecentWorkspacePaths()).toEqual(['/path/a']);
  });

  test('ignores empty strings', () => {
    addRecentWorkspacePath('/path/a');

    removeRecentWorkspacePath('');

    expect(getRecentWorkspacePaths()).toEqual(['/path/a']);
  });
});
