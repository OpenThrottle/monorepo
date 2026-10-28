import { describe, expect, it } from 'vitest';

import { isGitPreferHttpsEnabled, parseGitCloneUrl } from './git-clone-url.ts';

const CANONICAL = 'https://github.com/openthrottle/monorepo.git';

const parse = (input: string, preferHttps = false) =>
  parseGitCloneUrl(input, { preferHttps });

describe('parseGitCloneUrl', () => {
  describe('GitHub inputs that always resolve to HTTPS', () => {
    it.each([
      'openthrottle/monorepo',
      '  openthrottle/monorepo  ',
      'openthrottle/monorepo.git',
      'github.com/openthrottle/monorepo',
      'https://github.com/openthrottle/monorepo',
      'https://github.com/openthrottle/monorepo.git',
      'https://github.com/openthrottle/monorepo/',
      'https://GitHub.com/openthrottle/monorepo.git',
      'https://www.github.com/openthrottle/monorepo',
      'http://github.com/openthrottle/monorepo',
      'git://github.com/openthrottle/monorepo.git',
    ])(
      '%j -> the canonical HTTPS URL, even with SSH preference off',
      (input) => {
        expect(parse(input)).toEqual({
          cloneUrl: CANONICAL,
          github: { owner: 'openthrottle', repo: 'monorepo' },
          ok: true,
        });
      },
    );

    it('keeps dots, dashes and underscores in repo names', () => {
      expect(parse('o_1/.github-x.y_z')).toMatchObject({
        cloneUrl: 'https://github.com/o_1/.github-x.y_z.git',
        ok: true,
      });
    });
  });

  describe('explicit GitHub SSH URLs', () => {
    const sshInputs = [
      'git@github.com:openthrottle/monorepo.git',
      'git@github.com:openthrottle/monorepo',
      'ssh://git@github.com/openthrottle/monorepo.git',
      'ssh://git@github.com:22/openthrottle/monorepo.git',
    ];

    it.each(sshInputs)(
      '%j is left on SSH when HTTPS is not preferred',
      (input) => {
        expect(parse(input, false)).toEqual({
          cloneUrl: input,
          github: { owner: 'openthrottle', repo: 'monorepo' },
          ok: true,
        });
      },
    );

    it.each(sshInputs)(
      '%j is rewritten to HTTPS when HTTPS is preferred',
      (input) => {
        expect(parse(input, true)).toEqual({
          cloneUrl: CANONICAL,
          github: { owner: 'openthrottle', repo: 'monorepo' },
          ok: true,
        });
      },
    );
  });

  describe('non-GitHub URLs', () => {
    it.each([
      'https://gitlab.com/group/project.git',
      'git@gitlab.com:group/project.git',
      'ssh://git@bitbucket.org/team/repo.git',
      'ssh://git@github.com:2222/openthrottle/monorepo.git',
      'https://github.example.com/o/r.git',
      'file:///srv/repos/fixture',
      'git://example.com/o/r.git',
    ])('%j passes through unchanged, even when HTTPS is preferred', (input) => {
      expect(parse(input, true)).toEqual({
        cloneUrl: input,
        github: null,
        ok: true,
      });
    });
  });

  describe('malformed input', () => {
    it.each([
      '',
      '   ',
      'not a git url',
      'owner',
      'owner/',
      '/repo',
      'owner/repo/extra',
      '../repo',
      'owner/..',
      'owner/.',
      '../../etc/passwd',
      'own er/repo',
      'owner/re$po',
      'owner/repo?x=1',
      '-owner/repo',
      'https://github.com/owner',
      'https://github.com/owner/repo/tree/main',
      'https://github.com/owner/repo?tab=readme',
      'https://github.com/owner/repo#readme',
      'https://github.com/owner/..',
      'git@github.com:owner',
      'git@github.com:owner/repo/extra.git',
      'ssh://git@github.com/owner/repo/extra',
      '/srv/local/path',
      'C:\\repos\\thing',
      'ftp://example.com/o/r.git',
    ])('%j is rejected with a message', (input) => {
      const result = parse(input);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).not.toBe('');
    });
  });

  describe('credentials in the URL', () => {
    it.each([
      'https://user:ghp_secret@github.com/o/r.git',
      'https://ghp_secret@github.com/o/r.git',
      'https://user:pass@gitlab.com/g/p.git',
      'ssh://user:pass@github.com/o/r.git',
    ])('%j is rejected and the secret is not echoed', (input) => {
      const result = parse(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain('GITHUB_TOKEN');
        expect(result.message).not.toContain('ghp_secret');
        expect(result.message).not.toContain('pass');
      }
    });

    it.each([
      'openthrottle/monorepo',
      'https://github.com/openthrottle/monorepo.git',
      'git@github.com:openthrottle/monorepo.git',
      'ssh://git@github.com/openthrottle/monorepo.git',
    ])('the clone URL for %j has no http(s) userinfo', (input) => {
      const result = parse(input, true);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const url = new URL(result.cloneUrl);
        expect(url.username).toBe('');
        expect(url.password).toBe('');
      }
    });
  });
});

describe('isGitPreferHttpsEnabled', () => {
  it.each(['1', 'true', 'TRUE', ' yes ', 'on'])('is on for %j', (value) => {
    expect(
      isGitPreferHttpsEnabled({ OPENTHROTTLE_GIT_PREFER_HTTPS: value }),
    ).toBe(true);
  });

  it.each([undefined, '', '0', 'false', 'off', 'no', 'maybe'])(
    'is off for %j',
    (value) => {
      expect(
        isGitPreferHttpsEnabled({ OPENTHROTTLE_GIT_PREFER_HTTPS: value }),
      ).toBe(false);
    },
  );
});
