import { mkdtempSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { describe, expect, test } from 'vitest';
import {
  validateAndNormalizeFilesystemPath,
  validateDisplayName,
  validateGitDefaultBranch,
  validateGitRemoteUrl,
} from './workspace-local-repository.validation';

describe('validateAndNormalizeFilesystemPath', () => {
  test('returns resolved path for an existing directory', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'ot-ws-repo-'));
    const result = validateAndNormalizeFilesystemPath(`  ${tempDir}  `);
    expect(result).toBe(join(tempDir));
  });

  test('throws when path is empty', () => {
    expect(() => validateAndNormalizeFilesystemPath('   ')).toThrow(
      /filesystemPath is required/,
    );
  });

  test('throws when path contains NUL', () => {
    expect(() => validateAndNormalizeFilesystemPath('/tmp\0evil')).toThrow(
      /NUL/,
    );
  });

  test('throws for a non-existent path', () => {
    expect(() =>
      validateAndNormalizeFilesystemPath('/does/not/exist/ot-ws-9999'),
    ).toThrow(/does not exist/);
  });

  test('throws for a file instead of a directory', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'ot-ws-repo-'));
    const filePath = join(tempDir, 'file.txt');
    writeFileSync(filePath, 'x');
    expect(() => validateAndNormalizeFilesystemPath(filePath)).toThrow(
      /not a directory/,
    );
  });
});

describe('validateDisplayName', () => {
  test('returns trimmed display name', () => {
    expect(validateDisplayName('  My Repo  ')).toBe('My Repo');
  });

  test('throws when empty after trim', () => {
    expect(() => validateDisplayName('  ')).toThrow(/displayName is required/);
  });
});

describe('validateGitRemoteUrl', () => {
  test('accepts https origin URLs', () => {
    expect(validateGitRemoteUrl('https://github.com/org/repo.git')).toBe(
      'https://github.com/org/repo.git',
    );
  });

  test('returns null for blank values', () => {
    expect(validateGitRemoteUrl(null)).toBeNull();
    expect(validateGitRemoteUrl('  ')).toBeNull();
  });

  test('throws for invalid protocol', () => {
    expect(() => validateGitRemoteUrl('ftp://example.com/repo')).toThrow(
      /protocol/,
    );
  });
});

describe('validateGitDefaultBranch', () => {
  test('returns trimmed branch name', () => {
    expect(validateGitDefaultBranch(' main ')).toBe('main');
  });

  test('throws when branch contains slashes', () => {
    expect(() => validateGitDefaultBranch('feature/foo')).toThrow(
      /path separators/,
    );
  });
});
