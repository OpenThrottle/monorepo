import { describe, expect, it } from 'vitest';
import {
  parseRepositoryRemote,
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
