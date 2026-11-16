import { describe, expect, it } from 'vitest';

import { FORGE_KIND } from './source-control.constants.ts';
import {
  forgeKindOfPayload,
  parseForgeRemote,
  repoPayloadFields,
  splitFullName,
} from './source-control.utils.ts';

const HOSTS = {
  'github.com': FORGE_KIND.GITHUB,
  'gitlab.com': FORGE_KIND.GITLAB,
};

describe('forgeKindOfPayload', () => {
  it('reads an absent forge as GitHub, the shape of every pre-forge row', () => {
    expect(forgeKindOfPayload({ repo: 'a/b' })).toBe(FORGE_KIND.GITHUB);
  });

  it('returns a known forge as given', () => {
    expect(forgeKindOfPayload({ forge: 'gitlab' })).toBe(FORGE_KIND.GITLAB);
  });

  it('returns null for an unknown forge rather than guessing', () => {
    expect(forgeKindOfPayload({ forge: 'bitbucket' })).toBeNull();
  });
});

describe('repoPayloadFields', () => {
  it('omits the forge for GitHub so existing keys stay byte-identical', () => {
    expect(
      repoPayloadFields({ forge: FORGE_KIND.GITHUB, fullName: 'a/b' }),
    ).toEqual({ repo: 'a/b' });
  });

  it('names a non-default forge', () => {
    expect(
      repoPayloadFields({ forge: FORGE_KIND.GITLAB, fullName: 'g/s/p' }),
    ).toEqual({ forge: 'gitlab', repo: 'g/s/p' });
  });
});

describe('splitFullName', () => {
  it('splits on the last slash so a nested GitLab group stays the owner', () => {
    expect(splitFullName('group/sub/project')).toEqual({
      name: 'project',
      owner: 'group/sub',
    });
  });

  it.each(['', 'solo', '/x', 'x/', 42])('rejects %j', (value) => {
    expect(splitFullName(value)).toBeNull();
  });
});

describe('parseForgeRemote', () => {
  it.each([
    'https://github.com/acme/monorepo',
    'https://github.com/acme/monorepo.git',
    'https://user@github.com/acme/monorepo/',
    'git@github.com:acme/monorepo.git',
    'ssh://git@github.com/acme/monorepo.git',
    'https://GitHub.com/acme/monorepo',
  ])('resolves %s to github acme/monorepo', (url) => {
    expect(parseForgeRemote(url, HOSTS)).toEqual({
      forge: FORGE_KIND.GITHUB,
      fullName: 'acme/monorepo',
    });
  });

  it('keeps a nested GitLab path whole', () => {
    expect(
      parseForgeRemote('https://gitlab.com/group/sub/project', HOSTS),
    ).toEqual({ forge: FORGE_KIND.GITLAB, fullName: 'group/sub/project' });
  });

  it('returns null for an unknown host', () => {
    expect(
      parseForgeRemote('https://bitbucket.org/acme/monorepo', HOSTS),
    ).toBeNull();
  });

  it('returns null for a remote with no owner/name path', () => {
    expect(parseForgeRemote('https://github.com/acme', HOSTS)).toBeNull();
    expect(parseForgeRemote(null, HOSTS)).toBeNull();
  });
});
