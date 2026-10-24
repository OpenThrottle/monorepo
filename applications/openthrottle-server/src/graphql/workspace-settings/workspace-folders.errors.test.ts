import { describe, expect, it } from 'vitest';

import {
  classifyCheckoutRootFailure,
  classifyGitCloneFailure,
  classifyReadDirectoryFailure,
  WorkspaceFolderError,
  WorkspaceFolderErrorCode,
} from './workspace-folders.errors.ts';

const TIMEOUT_MS = 10 * 60 * 1000;

const errnoError = (code: string): Error =>
  Object.assign(new Error(`failed: ${code}`), { code });

const gitFailure = (
  stderr: string,
  extra: Record<string, unknown> = {},
): Error =>
  Object.assign(new Error('Command failed: git clone /srv/secret/path'), {
    stderr,
    ...extra,
  });

describe('WorkspaceFolderError', () => {
  it('carries its code as a GraphQL extension so formatError passes it through', () => {
    const error = new WorkspaceFolderError(
      WorkspaceFolderErrorCode.WORKSPACE_ROOTS_NOT_CONFIGURED,
      'Set OPENTHROTTLE_WORKSPACE_ROOTS',
    );

    expect(error.extensions.code).toBe('WORKSPACE_ROOTS_NOT_CONFIGURED');
    expect(error.toJSON().extensions).toEqual({
      code: 'WORKSPACE_ROOTS_NOT_CONFIGURED',
    });
  });
});

describe('classifyReadDirectoryFailure', () => {
  it.each(['EACCES', 'EPERM'])('classifies %s as not readable', (code) => {
    expect(classifyReadDirectoryFailure(errnoError(code), '/srv/x')?.code).toBe(
      WorkspaceFolderErrorCode.WORKSPACE_PATH_NOT_READABLE,
    );
  });

  it.each(['ENOENT', 'ENOTDIR'])('classifies %s as not found', (code) => {
    expect(classifyReadDirectoryFailure(errnoError(code), '/srv/x')?.code).toBe(
      WorkspaceFolderErrorCode.WORKSPACE_PATH_NOT_FOUND,
    );
  });

  it('returns undefined for unknown failures so they stay masked', () => {
    expect(
      classifyReadDirectoryFailure(errnoError('EIO'), '/srv/x'),
    ).toBeUndefined();
    expect(
      classifyReadDirectoryFailure(new Error('boom'), '/srv/x'),
    ).toBeUndefined();
  });
});

describe('classifyCheckoutRootFailure', () => {
  it('classifies permission failures as not writable', () => {
    expect(classifyCheckoutRootFailure(errnoError('EACCES'), '/r')?.code).toBe(
      WorkspaceFolderErrorCode.CHECKOUT_ROOT_NOT_WRITABLE,
    );
  });

  it('returns undefined for unknown failures', () => {
    expect(
      classifyCheckoutRootFailure(errnoError('EIO'), '/r'),
    ).toBeUndefined();
  });
});

describe('classifyGitCloneFailure', () => {
  it('classifies a missing git binary (spawn ENOENT)', () => {
    expect(classifyGitCloneFailure(errnoError('ENOENT'), TIMEOUT_MS).code).toBe(
      WorkspaceFolderErrorCode.GIT_NOT_INSTALLED,
    );
  });

  it.each([
    "fatal: Authentication failed for 'https://github.com/o/r.git/'",
    'git@github.com: Permission denied (publickey).\nfatal: Could not read from remote repository.',
    'fatal: could not read Username for https://github.com: terminal prompts disabled',
    'ERROR: Repository not found.',
    'Host key verification failed.',
    "fatal: unable to access 'https://github.com/o/r.git/': The requested URL returned error: 403",
    "fatal: unable to access 'https://github.com/o/r.git/': The requested URL returned error: 401",
    'remote: Permission to o/r.git denied to some-user.\nfatal: unable to access',
    'remote: Invalid username or token. Password authentication is not supported for Git operations.',
    "remote: Repository not found.\nfatal: repository 'https://github.com/o/r.git/' not found",
    "fatal: repository 'https://github.com/o/r.git/' not found",
  ])('classifies %j as an auth failure', (stderr) => {
    const error = classifyGitCloneFailure(gitFailure(stderr), TIMEOUT_MS);

    expect(error.code).toBe(WorkspaceFolderErrorCode.GIT_CLONE_AUTH_FAILED);
    expect(error.message).toContain('ambient credentials');
  });

  it('points the operator at GITHUB_TOKEN and the gh credential helper', () => {
    const error = classifyGitCloneFailure(
      gitFailure('fatal: could not read Username for https://github.com'),
      TIMEOUT_MS,
    );

    expect(error.message).toContain('GITHUB_TOKEN');
    expect(error.message).toContain('gh credential helper');
  });

  it('does not treat a generic missing local repository as an auth failure', () => {
    const error = classifyGitCloneFailure(
      gitFailure(
        "fatal: repository 'file:///nowhere' does not exist\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.",
      ),
      TIMEOUT_MS,
    );

    expect(error.code).toBe(WorkspaceFolderErrorCode.GIT_CLONE_FAILED);
  });

  it('redacts credentials embedded in URLs and drops the clone path line', () => {
    const error = classifyGitCloneFailure(
      gitFailure(
        "Cloning into '/srv/secret/path'...\nfatal: Authentication failed for 'https://user:ghp_token@github.com/o/r.git'",
      ),
      TIMEOUT_MS,
    );

    expect(error.message).not.toContain('ghp_token');
    expect(error.message).not.toContain('/srv/secret/path');
    expect(error.message).toContain('https://***@github.com');
  });

  it('reports a timeout when git was killed', () => {
    const error = classifyGitCloneFailure(
      gitFailure('', { killed: true }),
      TIMEOUT_MS,
    );

    expect(error.code).toBe(WorkspaceFolderErrorCode.GIT_CLONE_FAILED);
    expect(error.message).toContain('10 minutes');
  });

  it('falls back to a generic clone failure with sanitized stderr only', () => {
    const error = classifyGitCloneFailure(
      gitFailure("fatal: repository '/nowhere' does not exist"),
      TIMEOUT_MS,
    );

    expect(error.code).toBe(WorkspaceFolderErrorCode.GIT_CLONE_FAILED);
    expect(error.message).toBe(
      "git clone failed: fatal: repository '/nowhere' does not exist",
    );
    expect(error.message).not.toContain('Command failed');
  });

  it('still returns a user-facing error when there is no stderr at all', () => {
    expect(classifyGitCloneFailure(new Error('x'), TIMEOUT_MS).message).toBe(
      'git clone failed.',
    );
  });
});
