import type {
  EnsureUserEnvEntriesResult,
  UserEnvEntries,
} from '@openthrottle/agentic-hooks';
import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '../logger.ts';
import {
  DEFAULT_LOCAL_GRAPHQL_URL,
  isWorktreeContext,
  resolveScriptConfigDir,
  resolveScriptGraphqlUrl,
  syncUserEnvFile,
  USER_ENV_SCRIPT_SKIP_REASONS,
} from '../user-env-file.ts';

const TOKEN = 'ot_sa_abc_secret';

const makeLogger = (): Logger => {
  return {
    blank: vi.fn(),
    detail: vi.fn(),
    fail: vi.fn(),
    heading: vi.fn(),
    info: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  };
};

const allLogged = (logger: Logger): string => {
  return Object.values(logger)
    .flatMap((fn) => {
      return vi.mocked(fn).mock.calls.flat();
    })
    .join('\n');
};

const okResult = (changed: boolean): EnsureUserEnvEntriesResult => {
  return {
    changed,
    endpoint: changed ? 'added' : 'unchanged',
    envPath: '/home/u/.openthrottle/.env',
    ok: true,
    token: changed ? 'added' : 'unchanged',
  };
};

describe('resolveScriptGraphqlUrl', () => {
  it('uses the environment OPENTHROTTLE_* URL, pinned to the IPv4 loopback', () => {
    expect(
      resolveScriptGraphqlUrl({
        OPENTHROTTLE_SERVER_APP_URL: 'http://localhost:6021',
      }),
    ).toBe('http://127.0.0.1:6021/graphql');
  });

  it('falls back to the local primary server', () => {
    expect(resolveScriptGraphqlUrl({})).toBe(DEFAULT_LOCAL_GRAPHQL_URL);
  });
});

describe('resolveScriptConfigDir', () => {
  it('honours OPENTHROTTLE_USER_CONFIG_DIR and ignores a blank one', () => {
    expect(resolveScriptConfigDir({ OPENTHROTTLE_USER_CONFIG_DIR: '/cfg' })).toBe('/cfg'); // prettier-ignore
    expect(resolveScriptConfigDir({ OPENTHROTTLE_USER_CONFIG_DIR: ' ' })).toBeUndefined(); // prettier-ignore
    expect(resolveScriptConfigDir({})).toBeUndefined();
  });
});

describe('isWorktreeContext', () => {
  it('is true under OT_WORKTREE_DB or in a linked worktree', () => {
    expect(isWorktreeContext({ OT_WORKTREE_DB: 'isolated' }, () => false)).toBe(true); // prettier-ignore
    expect(isWorktreeContext({}, () => true)).toBe(true);
  });

  it('is false on the primary checkout', () => {
    expect(isWorktreeContext({ OT_WORKTREE_DB: '' }, () => false)).toBe(false);
  });
});

describe('syncUserEnvFile', () => {
  describe('in a worktree', () => {
    it('never calls the writer', () => {
      const ensure = vi.fn();
      const outcome = syncUserEnvFile({
        authToken: TOKEN,
        configDir: undefined,
        ensure,
        graphqlUrl: DEFAULT_LOCAL_GRAPHQL_URL,
        isWorktree: true,
        logger: makeLogger(),
      });
      expect(outcome).toEqual({
        kind: 'skipped',
        reason: USER_ENV_SCRIPT_SKIP_REASONS.WORKTREE,
      });
      expect(ensure).not.toHaveBeenCalled();
    });
  });

  describe('without a token', () => {
    it('warns once and never calls the writer', () => {
      const ensure = vi.fn();
      const logger = makeLogger();
      const outcome = syncUserEnvFile({
        authToken: '  ',
        configDir: undefined,
        ensure,
        graphqlUrl: DEFAULT_LOCAL_GRAPHQL_URL,
        isWorktree: false,
        logger,
      });
      expect(outcome).toEqual({
        kind: 'skipped',
        reason: USER_ENV_SCRIPT_SKIP_REASONS.NO_TOKEN,
      });
      expect(ensure).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('with a token on the primary checkout', () => {
    it('hands the trimmed entries and config dir to the writer', () => {
      const ensure = vi.fn((_entries: UserEnvEntries, _configDir?: string) =>
        okResult(true),
      );
      const logger = makeLogger();
      const outcome = syncUserEnvFile({
        authToken: ` ${TOKEN} `,
        configDir: '/cfg',
        ensure,
        graphqlUrl: 'https://ot.example.com/graphql',
        isWorktree: false,
        logger,
      });
      expect(ensure).toHaveBeenCalledWith(
        { authToken: TOKEN, graphqlUrl: 'https://ot.example.com/graphql' },
        '/cfg',
      );
      expect(outcome).toEqual({ kind: 'ran', result: okResult(true) });
      expect(logger.success).toHaveBeenCalledTimes(1);
    });

    it('stays quiet-but-informative when the file is already current', () => {
      const logger = makeLogger();
      syncUserEnvFile({
        authToken: TOKEN,
        configDir: undefined,
        ensure: () => okResult(false),
        graphqlUrl: DEFAULT_LOCAL_GRAPHQL_URL,
        isWorktree: false,
        logger,
      });
      expect(logger.success).not.toHaveBeenCalled();
      expect(logger.detail).toHaveBeenCalledTimes(1);
    });

    it('turns a writer failure into one warning', () => {
      const logger = makeLogger();
      const outcome = syncUserEnvFile({
        authToken: TOKEN,
        configDir: undefined,
        ensure: () => {
          return { envPath: '/x/.env', error: 'EACCES', ok: false };
        },
        graphqlUrl: DEFAULT_LOCAL_GRAPHQL_URL,
        isWorktree: false,
        logger,
      });
      expect(outcome.kind).toBe('ran');
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('never logs the token', () => {
      const logger = makeLogger();
      syncUserEnvFile({
        authToken: TOKEN,
        configDir: undefined,
        ensure: () => okResult(true),
        graphqlUrl: DEFAULT_LOCAL_GRAPHQL_URL,
        isWorktree: false,
        logger,
      });
      expect(allLogged(logger)).not.toContain(TOKEN);
    });
  });
});
