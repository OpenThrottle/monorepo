/**
 * @description Unit tests for the worktree-root ladder: each rung wins in order, `~` expands, blank
 * values fall through, the reported `source` is right, and the default stays in lockstep with
 * `resolve_worktree_root` in `skills/ot-worktree/scripts/root.sh` and the documented value in
 * `.env.default`.
 */

import { resolve } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockHomedir, mockReadFileSync } = vi.hoisted(() => ({
  mockHomedir: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock('node:fs', () => ({ readFileSync: mockReadFileSync }));
vi.mock('node:os', () => ({ homedir: mockHomedir }));

import {
  DEFAULT_WORKTREE_ROOT_RELATIVE_PATH,
  WORKTREE_ROOT_SOURCE,
} from './worktree-root.constants.ts';
import type { ResolveWorktreeRootParams } from './worktree-root.types.ts';
import {
  normalizeWorktreeRootSetting,
  repositoryNamespace,
  resolveWorktreeRoot,
} from './worktree-root.utils.ts';

const BASE = '/Users/matt/Development/openthrottle';

/** What OT appends beneath the root for BASE, given the remote stubbed below. */
const NS = 'acme/openthrottle';

/** The origin remote the next {@link resolveRoot} call passes in; null for a repo with none. */
const remoteState: { current: string | null } = { current: null };

const withRemote = (remote: string | null): void => {
  remoteState.current = remote;
};

/** {@link resolveWorktreeRoot} with the remote {@link withRemote} last set, as a caller passes it. */
const resolveRoot = (
  params: Omit<ResolveWorktreeRootParams, 'originRemote'>,
): ReturnType<typeof resolveWorktreeRoot> => {
  return resolveWorktreeRoot({ ...params, originRemote: remoteState.current });
};

/** No `.env` on disk — the common case; `readFileSync` throws ENOENT. */
const withoutCheckoutEnv = (): void => {
  mockReadFileSync.mockImplementation(() => {
    throw new Error('ENOENT: no such file or directory');
  });
};

const withCheckoutEnv = (contents: string): void => {
  mockReadFileSync.mockImplementation((path: string) => {
    if (path === `${BASE}/.env`) return contents;
    throw new Error('ENOENT: no such file or directory');
  });
};

describe('resolveWorktreeRoot', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockHomedir.mockReset();
    mockHomedir.mockReturnValue('/Users/matt');
    withRemote('https://github.com/acme/openthrottle.git');
    withoutCheckoutEnv();
  });

  it('prefers the process env over every other rung', () => {
    withCheckoutEnv('OPENTHROTTLE_WORKTREE_ROOT=/from/dot-env\n');

    expect(
      resolveRoot({
        baseCheckoutPath: BASE,
        env: { OPENTHROTTLE_WORKTREE_ROOT: '/from/env' },
      }),
    ).toEqual({
      baseRoot: '/from/env',
      resolvedRoot: `/from/env/${NS}`,
      source: WORKTREE_ROOT_SOURCE.ENV,
    });
  });

  it("falls to the target repo's .env — how a repo customizes its own worktrees", () => {
    withCheckoutEnv('FOO=bar\nOPENTHROTTLE_WORKTREE_ROOT=/from/dot-env\n');

    expect(resolveRoot({ baseCheckoutPath: BASE, env: {} })).toEqual({
      baseRoot: '/from/dot-env',
      resolvedRoot: `/from/dot-env/${NS}`,
      source: WORKTREE_ROOT_SOURCE.CHECKOUT_ENV,
    });
  });

  it('takes the last .env assignment, stripping CR and quotes, as dotenv would', () => {
    withCheckoutEnv(
      'OPENTHROTTLE_WORKTREE_ROOT=/first\r\nOPENTHROTTLE_WORKTREE_ROOT = "/second/wt"\r\n',
    );

    expect(resolveRoot({ baseCheckoutPath: BASE, env: {} }).resolvedRoot).toBe(
      `/second/wt/${NS}`,
    );
  });

  it('drops an inline comment after a quoted value, not just the quotes', () => {
    // The shape `.env.default` actually ships. Keeping the comment made worktrees land in a
    // directory literally named `worktrees" # Where git worktrees are created`.
    withCheckoutEnv(
      'OPENTHROTTLE_WORKTREE_ROOT="/wt" # Where git worktrees are created\n',
    );

    expect(resolveRoot({ baseCheckoutPath: BASE, env: {} }).resolvedRoot).toBe(
      `/wt/${NS}`,
    );
  });

  it('drops an inline comment after an unquoted value', () => {
    withCheckoutEnv('OPENTHROTTLE_WORKTREE_ROOT=/wt   # somewhere else\n');

    expect(resolveRoot({ baseCheckoutPath: BASE, env: {} }).resolvedRoot).toBe(
      `/wt/${NS}`,
    );
  });

  it('keeps a # that is part of the path itself', () => {
    withCheckoutEnv('OPENTHROTTLE_WORKTREE_ROOT=/wt/a#b\n');

    expect(resolveRoot({ baseCheckoutPath: BASE, env: {} }).resolvedRoot).toBe(
      `/wt/a#b/${NS}`,
    );
  });

  it('falls back to ~/.openthrottle/worktrees/<org>/<repo>', () => {
    expect(resolveRoot({ baseCheckoutPath: BASE, env: {} })).toEqual({
      baseRoot: `/Users/matt/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}`,
      resolvedRoot: `/Users/matt/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}/${NS}`,
      source: WORKTREE_ROOT_SOURCE.DEFAULT,
    });
  });

  it('organizes beneath a CONFIGURED root too, not just the default', () => {
    // The root is a root, not a final destination. If a configured root were used verbatim, every
    // repo sharing it would pile its worktrees into one directory.
    expect(
      resolveRoot({
        baseCheckoutPath: BASE,
        env: { OPENTHROTTLE_WORKTREE_ROOT: '/configured' },
      }).resolvedRoot,
    ).toBe(`/configured/${NS}`);
  });

  it('separates same-named repos from different orgs', () => {
    withRemote('https://github.com/acme/monorepo.git');
    const acme = resolveRoot({
      baseCheckoutPath: '/w/monorepo',
      env: {},
    });

    withRemote('git@github.com:other-org/monorepo.git');
    const other = resolveRoot({
      baseCheckoutPath: '/w/monorepo',
      env: {},
    });

    // Same directory name, same root — the remote is what keeps them apart.
    expect(acme.resolvedRoot).toMatch(/\/acme\/monorepo$/);
    expect(other.resolvedRoot).toMatch(/\/other-org\/monorepo$/);
    expect(acme.resolvedRoot).not.toBe(other.resolvedRoot);
  });

  it('falls back to the directory name when the repo has no remote', () => {
    withRemote(null);

    expect(
      resolveRoot({ baseCheckoutPath: '/w/local-only', env: {} }).resolvedRoot,
    ).toBe(`/Users/matt/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}/local-only`);
  });

  it('expands a leading ~ and strips trailing slashes', () => {
    expect(
      resolveRoot({
        baseCheckoutPath: BASE,
        env: { OPENTHROTTLE_WORKTREE_ROOT: '~/wt/here///' },
      }),
    ).toEqual({
      baseRoot: '/Users/matt/wt/here',
      resolvedRoot: `/Users/matt/wt/here/${NS}`,
      source: WORKTREE_ROOT_SOURCE.ENV,
    });
  });

  it('reports a ~-prefixed, trailing-slashed checkout .env root as its base, without <org>/<repo>', () => {
    withCheckoutEnv('OPENTHROTTLE_WORKTREE_ROOT="~/elsewhere/"\n');

    expect(resolveRoot({ baseCheckoutPath: BASE, env: {} })).toEqual({
      baseRoot: '/Users/matt/elsewhere',
      resolvedRoot: `/Users/matt/elsewhere/${NS}`,
      source: WORKTREE_ROOT_SOURCE.CHECKOUT_ENV,
    });
  });

  it('keeps baseRoot independent of the repository, so repos sharing a root report one root', () => {
    withRemote('https://github.com/acme/monorepo.git');
    const acme = resolveRoot({ baseCheckoutPath: '/w/a', env: {} });

    withRemote('https://github.com/other-org/site.git');
    const other = resolveRoot({ baseCheckoutPath: '/w/b', env: {} });

    expect(acme.resolvedRoot).not.toBe(other.resolvedRoot);
    expect(acme.baseRoot).toBe(other.baseRoot);
  });

  it('treats blank and whitespace-only values as absent at every rung', () => {
    withCheckoutEnv('OPENTHROTTLE_WORKTREE_ROOT=   \n');

    expect(
      resolveRoot({
        baseCheckoutPath: BASE,
        env: { OPENTHROTTLE_WORKTREE_ROOT: '  ' },
      }),
    ).toEqual({
      baseRoot: `/Users/matt/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}`,
      resolvedRoot: `/Users/matt/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}/${NS}`,
      source: WORKTREE_ROOT_SOURCE.DEFAULT,
    });
  });

  it('fails fast on a configured root that is not absolute', () => {
    expect(() =>
      resolveRoot({
        baseCheckoutPath: BASE,
        env: { OPENTHROTTLE_WORKTREE_ROOT: 'relative/worktrees' },
      }),
    ).toThrow(/absolute path/);
  });

  it('has exactly three rungs — one variable, two sources, one default', () => {
    // Guards the simplification: a fourth rung means a second source of truth for the same answer,
    // which is what let the CLI and the server disagree before.
    expect(Object.values(WORKTREE_ROOT_SOURCE).sort()).toEqual([
      'checkout-env',
      'default',
      'env',
    ]);
  });
});

describe('normalizeWorktreeRootSetting', () => {
  it.each([undefined, null, '', '   '])('treats %p as absent', (value) => {
    expect(normalizeWorktreeRootSetting(value)).toBeNull();
  });

  it('trims a real value', () => {
    expect(normalizeWorktreeRootSetting('  /srv/wt  ')).toBe('/srv/wt');
  });
});

describe('repositoryNamespace', () => {
  it.each([
    ['https://github.com/acme/monorepo.git', 'acme/monorepo'],
    ['https://github.com/acme/monorepo', 'acme/monorepo'],
    ['git@github.com:acme/monorepo.git', 'acme/monorepo'],
    ['ssh://git@github.com/Acme_Org/my.repo', 'Acme_Org/my.repo'],
    ['https://github.com/acme/monorepo/', 'acme/monorepo'],
  ])('derives %s -> %s', (remote, expected) => {
    expect(repositoryNamespace('/w/whatever', remote)).toBe(expected);
  });

  it('sanitizes segments so a hostile remote cannot escape the root', () => {
    const ns = repositoryNamespace(
      '/w/whatever',
      'https://github.com/../..%2Fetc/passwd',
    );

    // The invariant is non-escape, not the absence of dots: `..-2Fetc` is a harmless directory
    // name, because a segment only traverses when it IS exactly `..`.
    expect(resolve('/root', ns).startsWith('/root/')).toBe(true);
    expect(ns.split('/').every((segment) => segment !== '..')).toBe(true);
  });

  it('falls back to the directory basename without a remote', () => {
    expect(repositoryNamespace('/w/local-only', null)).toBe('local-only');
  });
});
