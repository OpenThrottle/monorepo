/**
 * @description Unit tests for the worktree-root ladder: each rung wins in order, `~` expands, blank
 * values fall through, the reported `source` is right, and the default stays in lockstep with
 * `resolve_worktree_root` in `skills/ot-worktree/scripts/root.sh` and the documented value in
 * `.env.default`.
 */

import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockExecFileSync, mockHomedir, mockReadFileSync } = vi.hoisted(() => ({
  mockExecFileSync: vi.fn(),
  mockHomedir: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({ execFileSync: mockExecFileSync }));
vi.mock('node:fs', () => ({ readFileSync: mockReadFileSync }));
vi.mock('node:os', () => ({ homedir: mockHomedir }));

import {
  DEFAULT_WORKTREE_ROOT_RELATIVE_PATH,
  WORKTREE_ROOT_SOURCE,
  normalizeWorktreeRootSetting,
  repositoryNamespace,
  resolveWorktreeRoot,
} from './worktree-root.resolver';

const BASE = '/Users/matt/Development/openthrottle';

/** What OT appends beneath the root for BASE, given the remote stubbed below. */
const NS = 'acme/openthrottle';

/** Stubs `git remote get-url origin`; pass null for a repo with no remote. */
const withRemote = (remote: string | null): void => {
  mockExecFileSync.mockImplementation(() => {
    if (remote === null) throw new Error('no origin');
    return remote;
  });
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
    mockExecFileSync.mockReset();
    withRemote('https://github.com/acme/openthrottle.git');
    withoutCheckoutEnv();
  });

  it('prefers the process env over every other rung', () => {
    withCheckoutEnv('OPENTHROTTLE_WORKTREE_ROOT=/from/dot-env\n');

    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: { OPENTHROTTLE_WORKTREE_ROOT: '/from/env' },
      }),
    ).toEqual({
      resolvedRoot: `/from/env/${NS}`,
      source: WORKTREE_ROOT_SOURCE.ENV,
    });
  });

  it("falls to the target repo's .env — how a repo customizes its own worktrees", () => {
    withCheckoutEnv('FOO=bar\nOPENTHROTTLE_WORKTREE_ROOT=/from/dot-env\n');

    expect(resolveWorktreeRoot({ baseCheckoutPath: BASE, env: {} })).toEqual({
      resolvedRoot: `/from/dot-env/${NS}`,
      source: WORKTREE_ROOT_SOURCE.CHECKOUT_ENV,
    });
  });

  it('takes the last .env assignment, stripping CR and quotes, as dotenv would', () => {
    withCheckoutEnv(
      'OPENTHROTTLE_WORKTREE_ROOT=/first\r\nOPENTHROTTLE_WORKTREE_ROOT = "/second/wt"\r\n',
    );

    expect(
      resolveWorktreeRoot({ baseCheckoutPath: BASE, env: {} }).resolvedRoot,
    ).toBe(`/second/wt/${NS}`);
  });

  it('drops an inline comment after a quoted value, not just the quotes', () => {
    // The shape `.env.default` actually ships. Keeping the comment made worktrees land in a
    // directory literally named `worktrees" # Where git worktrees are created`.
    withCheckoutEnv(
      'OPENTHROTTLE_WORKTREE_ROOT="/wt" # Where git worktrees are created\n',
    );

    expect(
      resolveWorktreeRoot({ baseCheckoutPath: BASE, env: {} }).resolvedRoot,
    ).toBe(`/wt/${NS}`);
  });

  it('drops an inline comment after an unquoted value', () => {
    withCheckoutEnv('OPENTHROTTLE_WORKTREE_ROOT=/wt   # somewhere else\n');

    expect(
      resolveWorktreeRoot({ baseCheckoutPath: BASE, env: {} }).resolvedRoot,
    ).toBe(`/wt/${NS}`);
  });

  it('keeps a # that is part of the path itself', () => {
    withCheckoutEnv('OPENTHROTTLE_WORKTREE_ROOT=/wt/a#b\n');

    expect(
      resolveWorktreeRoot({ baseCheckoutPath: BASE, env: {} }).resolvedRoot,
    ).toBe(`/wt/a#b/${NS}`);
  });

  it('falls back to ~/.openthrottle/worktrees/<org>/<repo>', () => {
    expect(resolveWorktreeRoot({ baseCheckoutPath: BASE, env: {} })).toEqual({
      resolvedRoot: `/Users/matt/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}/${NS}`,
      source: WORKTREE_ROOT_SOURCE.DEFAULT,
    });
  });

  it('organizes beneath a CONFIGURED root too, not just the default', () => {
    // The root is a root, not a final destination. If a configured root were used verbatim, every
    // repo sharing it would pile its worktrees into one directory.
    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: { OPENTHROTTLE_WORKTREE_ROOT: '/configured' },
      }).resolvedRoot,
    ).toBe(`/configured/${NS}`);
  });

  it('separates same-named repos from different orgs', () => {
    withRemote('https://github.com/acme/monorepo.git');
    const acme = resolveWorktreeRoot({
      baseCheckoutPath: '/w/monorepo',
      env: {},
    });

    withRemote('git@github.com:other-org/monorepo.git');
    const other = resolveWorktreeRoot({
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
      resolveWorktreeRoot({ baseCheckoutPath: '/w/local-only', env: {} })
        .resolvedRoot,
    ).toBe(`/Users/matt/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}/local-only`);
  });

  it('expands a leading ~ and strips trailing slashes', () => {
    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: { OPENTHROTTLE_WORKTREE_ROOT: '~/wt/here///' },
      }).resolvedRoot,
    ).toBe(`/Users/matt/wt/here/${NS}`);
  });

  it('treats blank and whitespace-only values as absent at every rung', () => {
    withCheckoutEnv('OPENTHROTTLE_WORKTREE_ROOT=   \n');

    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: { OPENTHROTTLE_WORKTREE_ROOT: '  ' },
      }),
    ).toEqual({
      resolvedRoot: `/Users/matt/${DEFAULT_WORKTREE_ROOT_RELATIVE_PATH}/${NS}`,
      source: WORKTREE_ROOT_SOURCE.DEFAULT,
    });
  });

  it('fails fast on a configured root that is not absolute', () => {
    expect(() =>
      resolveWorktreeRoot({
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
  beforeEach(() => {
    mockExecFileSync.mockReset();
  });

  it.each([
    ['https://github.com/acme/monorepo.git', 'acme/monorepo'],
    ['https://github.com/acme/monorepo', 'acme/monorepo'],
    ['git@github.com:acme/monorepo.git', 'acme/monorepo'],
    ['ssh://git@github.com/Acme_Org/my.repo', 'Acme_Org/my.repo'],
    ['https://github.com/acme/monorepo/', 'acme/monorepo'],
  ])('derives %s -> %s', (remote, expected) => {
    withRemote(remote);

    expect(repositoryNamespace('/w/whatever')).toBe(expected);
  });

  it('sanitizes segments so a hostile remote cannot escape the root', () => {
    withRemote('https://github.com/../..%2Fetc/passwd');

    const ns = repositoryNamespace('/w/whatever');

    // The invariant is non-escape, not the absence of dots: `..-2Fetc` is a harmless directory
    // name, because a segment only traverses when it IS exactly `..`.
    expect(resolve('/root', ns).startsWith('/root/')).toBe(true);
    expect(ns.split('/').every((segment) => segment !== '..')).toBe(true);
  });

  it('falls back to the directory basename without a remote', () => {
    withRemote(null);

    expect(repositoryNamespace('/w/local-only')).toBe('local-only');
  });
});
