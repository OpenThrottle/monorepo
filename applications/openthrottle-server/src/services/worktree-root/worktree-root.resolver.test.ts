/**
 * @description Unit tests for the shared worktree-root ladder: each rung wins in order, `~`
 * expands, blank values fall through, the reported `source` is right, and the default rung stays
 * byte-identical to `scripts/create_worktree.sh`'s `$(dirname "$_repo")/openthrottle-worktrees`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockHomedir, mockReadFileSync } = vi.hoisted(() => ({
  mockHomedir: vi.fn(),
  mockReadFileSync: vi.fn(),
}));

vi.mock('node:fs', () => ({ readFileSync: mockReadFileSync }));
vi.mock('node:os', () => ({ homedir: mockHomedir }));

import {
  DEFAULT_WORKTREE_ROOT_DIRECTORY_NAME,
  WORKTREE_ROOT_SOURCE,
  normalizeWorktreeRootSetting,
  resolveWorktreeRoot,
} from './worktree-root.resolver';

const BASE = '/Users/matt/Development/openthrottle';

/** No `.env` on disk — the common case; `readFileSync` throws ENOENT. */
const withoutCheckoutEnv = (): void => {
  mockReadFileSync.mockImplementation(() => {
    throw new Error('ENOENT: no such file or directory');
  });
};

const withCheckoutEnv = (contents: string): void => {
  mockReadFileSync.mockReturnValue(contents);
};

describe('resolveWorktreeRoot', () => {
  beforeEach(() => {
    mockReadFileSync.mockReset();
    mockHomedir.mockReset();
    mockHomedir.mockReturnValue('/Users/matt');
    withoutCheckoutEnv();
  });

  it('prefers the settings value over every other rung', () => {
    withCheckoutEnv('OT_WORKTREE_ROOT=/from/dot-env\n');

    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: { OT_WORKTREE_ROOT: '/from/env' },
        settingsWorktreeRoot: '/from/settings',
      }),
    ).toEqual({
      resolvedRoot: '/from/settings',
      source: WORKTREE_ROOT_SOURCE.SETTINGS,
    });
  });

  it('falls to the process env when there is no settings value', () => {
    withCheckoutEnv('OT_WORKTREE_ROOT=/from/dot-env\n');

    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: { OT_WORKTREE_ROOT: '/from/env' },
        settingsWorktreeRoot: null,
      }),
    ).toEqual({
      resolvedRoot: '/from/env',
      source: WORKTREE_ROOT_SOURCE.ENV,
    });
  });

  it("falls to the base checkout's .env when settings and env are empty", () => {
    withCheckoutEnv('FOO=bar\nOT_WORKTREE_ROOT=/from/dot-env\n');

    expect(resolveWorktreeRoot({ baseCheckoutPath: BASE, env: {} })).toEqual({
      resolvedRoot: '/from/dot-env',
      source: WORKTREE_ROOT_SOURCE.CHECKOUT_ENV,
    });
  });

  it('takes the LAST .env assignment, unquoted and CR-stripped', () => {
    withCheckoutEnv(
      'OT_WORKTREE_ROOT=/first\r\nOT_WORKTREE_ROOT = "/second/wt"\r\n',
    );

    expect(resolveWorktreeRoot({ baseCheckoutPath: BASE, env: {} })).toEqual({
      resolvedRoot: '/second/wt',
      source: WORKTREE_ROOT_SOURCE.CHECKOUT_ENV,
    });
  });

  it('matches the shell script default: a sibling of the base checkout', () => {
    expect(resolveWorktreeRoot({ baseCheckoutPath: BASE, env: {} })).toEqual({
      resolvedRoot: `/Users/matt/Development/${DEFAULT_WORKTREE_ROOT_DIRECTORY_NAME}`,
      source: WORKTREE_ROOT_SOURCE.DEFAULT,
    });
    // The script's rung is literally `$(dirname "$_repo")/openthrottle-worktrees`; naming it here
    // means a rename on either side breaks this test rather than drifting silently.
    expect(DEFAULT_WORKTREE_ROOT_DIRECTORY_NAME).toBe('openthrottle-worktrees');
  });

  it('treats blank and whitespace-only values as absent at every rung', () => {
    withCheckoutEnv('OT_WORKTREE_ROOT=   \n');

    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: { OT_WORKTREE_ROOT: '  ' },
        settingsWorktreeRoot: '   ',
      }),
    ).toEqual({
      resolvedRoot: `/Users/matt/Development/${DEFAULT_WORKTREE_ROOT_DIRECTORY_NAME}`,
      source: WORKTREE_ROOT_SOURCE.DEFAULT,
    });
  });

  it('expands a leading ~ against the home directory', () => {
    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: {},
        settingsWorktreeRoot: '~/worktrees',
      }),
    ).toEqual({
      resolvedRoot: '/Users/matt/worktrees',
      source: WORKTREE_ROOT_SOURCE.SETTINGS,
    });
  });

  it('expands a bare ~ to the home directory itself', () => {
    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: {},
        settingsWorktreeRoot: '~',
      }).resolvedRoot,
    ).toBe('/Users/matt');
  });

  it('strips trailing slashes', () => {
    expect(
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: {},
        settingsWorktreeRoot: '/srv/wt///',
      }).resolvedRoot,
    ).toBe('/srv/wt');
  });

  it('throws rather than resolve a relative configured root', () => {
    expect(() =>
      resolveWorktreeRoot({
        baseCheckoutPath: BASE,
        env: {},
        settingsWorktreeRoot: 'relative/wt',
      }),
    ).toThrow(/absolute path/);
  });
});

describe('normalizeWorktreeRootSetting', () => {
  it('returns the trimmed value, or null for absent and blank input', () => {
    expect(normalizeWorktreeRootSetting('  /srv/wt  ')).toBe('/srv/wt');
    expect(normalizeWorktreeRootSetting('')).toBeNull();
    expect(normalizeWorktreeRootSetting('   ')).toBeNull();
    expect(normalizeWorktreeRootSetting(null)).toBeNull();
    expect(normalizeWorktreeRootSetting(undefined)).toBeNull();
  });
});
