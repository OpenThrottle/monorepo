import { describe, expect, it } from 'vitest';
import {
  parseRepositoryRemote,
  shortenBranchName,
  shortenFilesystemPath,
} from '../repository-identity';

describe('parseRepositoryRemote', () => {
  it('parses ssh shorthand remotes', () => {
    expect(
      parseRepositoryRemote('git@github.com:openthrottle/monorepo.git'),
    ).toEqual({ host: 'github.com', name: 'monorepo', owner: 'openthrottle' });
  });

  it('parses ssh:// remotes with userinfo', () => {
    expect(
      parseRepositoryRemote('ssh://git@github.com/visormatt/native-apps.git'),
    ).toEqual({ host: 'github.com', name: 'native-apps', owner: 'visormatt' });
  });

  it('parses https remotes and strips userinfo, trailing .git and slashes', () => {
    expect(
      parseRepositoryRemote(
        'https://token@github.com/openthrottle/monorepo.git/',
      ),
    ).toEqual({ host: 'github.com', name: 'monorepo', owner: 'openthrottle' });
  });

  it('upgrades http to https and lowercases the host', () => {
    expect(
      parseRepositoryRemote('http://GitHub.COM/OpenThrottle/.github'),
    ).toEqual({
      host: 'github.com',
      name: '.github',
      owner: 'OpenThrottle',
    });
  });

  it('collapses nested GitLab groups into the owner', () => {
    expect(
      parseRepositoryRemote('https://gitlab.com/group/subgroup/repo.git'),
    ).toEqual({ host: 'gitlab.com', name: 'repo', owner: 'group/subgroup' });
  });

  it('parses a self-hosted host', () => {
    expect(
      parseRepositoryRemote('git@git.internal.example:platform/monorepo.git'),
    ).toEqual({
      host: 'git.internal.example',
      name: 'monorepo',
      owner: 'platform',
    });
  });

  it('returns null for empty, missing and unparseable input', () => {
    expect(parseRepositoryRemote(null)).toBeNull();
    expect(parseRepositoryRemote(undefined)).toBeNull();
    expect(parseRepositoryRemote('   ')).toBeNull();
    expect(parseRepositoryRemote('not-a-remote')).toBeNull();
    expect(
      parseRepositoryRemote('/Users/matt/Development/openthrottle'),
    ).toBeNull();
  });

  it('returns null when there is no owner segment to group by', () => {
    expect(parseRepositoryRemote('https://github.com/monorepo.git')).toBeNull();
  });
});

describe('shortenFilesystemPath', () => {
  it('keeps the last two segments behind an ellipsis by default', () => {
    expect(shortenFilesystemPath('/Users/matt/Development/openthrottle')).toBe(
      '…/Development/openthrottle',
    );
  });

  it('honours an explicit segment count', () => {
    expect(
      shortenFilesystemPath('/Users/matt/Development/openthrottle', 1),
    ).toBe('…/openthrottle');
  });

  it('returns the path unchanged when it is already short enough', () => {
    expect(shortenFilesystemPath('/srv/monorepo')).toBe('/srv/monorepo');
    expect(shortenFilesystemPath('monorepo')).toBe('monorepo');
  });
});

describe('shortenBranchName', () => {
  it('returns a short branch verbatim', () => {
    expect(shortenBranchName('main')).toBe('main');
    // 17 characters — one under the default cap, so it must pass through.
    expect(shortenBranchName('claude/nx-upgrade')).toBe('claude/nx-upgrade');
    // The exact string the live pass reads on the plan-detail popover row.
    expect(shortenBranchName('claude/nx-upgrade-plan-ce8b01')).toBe(
      'claude…plan-ce8b01',
    );
  });

  it('drops the middle and keeps the distinguishing tail', () => {
    const shortened = shortenBranchName('visormatt/bootstrap-service-accounts');

    expect(shortened).toBe('visorm…ce-accounts');
    expect(shortened.length).toBeLessThanOrEqual(18);
    expect(shortened.endsWith('ce-accounts')).toBe(true);
  });

  it('keeps two same-prefixed branches tellable apart', () => {
    expect(shortenBranchName('claude/nx-upgrade-plan-aaaaaaaa', 20)).not.toBe(
      shortenBranchName('claude/nx-upgrade-plan-bbbbbbbb', 20),
    );
  });

  it('uses a single ellipsis character, not three dots', () => {
    const shortened = shortenBranchName('visormatt/bootstrap-service-accounts');

    expect(shortened).toContain('…');
    expect(shortened).not.toContain('...');
  });

  it('truncates a branch with no slash', () => {
    expect(
      shortenBranchName('averyveryverylongbranchnamewithnoslashesatall', 20),
    ).toBe('averyve…slashesatall');
  });

  it('honours an explicit max length', () => {
    expect(
      shortenBranchName('visormatt/bootstrap-service-accounts', 12).length,
    ).toBe(12);
  });

  it('is a no-op on an empty string', () => {
    expect(shortenBranchName('')).toBe('');
  });
});
