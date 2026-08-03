import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { execFileSyncMock } = vi.hoisted(() => ({
  execFileSyncMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execFileSync: (...args: unknown[]): unknown => execFileSyncMock(...args),
}));

import { resolveGitBranchFromCwd } from '../git.ts';

describe('resolveGitBranchFromCwd', () => {
  beforeEach(() => {
    execFileSyncMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the trimmed branch name when git succeeds', () => {
    execFileSyncMock.mockReturnValue('  capture-branch-name\n');

    expect(resolveGitBranchFromCwd('/repo')).toBe('capture-branch-name');
    expect(execFileSyncMock).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      {
        cwd: '/repo',
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
  });

  it('returns null when the result is blank after trim', () => {
    execFileSyncMock.mockReturnValue('  \n');

    expect(resolveGitBranchFromCwd('/repo')).toBeNull();
  });

  it('returns null when the result is literal HEAD (detached)', () => {
    execFileSyncMock.mockReturnValue('HEAD\n');

    expect(resolveGitBranchFromCwd('/repo')).toBeNull();
  });

  it('returns null when git fails', () => {
    execFileSyncMock.mockImplementation(() => {
      throw new Error('not a git repository');
    });

    expect(resolveGitBranchFromCwd('/not-a-repo')).toBeNull();
  });

  it('defaults cwd to process.cwd()', () => {
    execFileSyncMock.mockReturnValue('main\n');
    const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/default-cwd');

    expect(resolveGitBranchFromCwd()).toBe('main');
    expect(execFileSyncMock).toHaveBeenCalledWith(
      'git',
      ['rev-parse', '--abbrev-ref', 'HEAD'],
      expect.objectContaining({ cwd: '/default-cwd' }),
    );

    cwdSpy.mockRestore();
  });
});
