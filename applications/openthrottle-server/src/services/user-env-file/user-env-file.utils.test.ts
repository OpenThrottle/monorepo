import type { EnsureUserEnvEntriesResult } from '@openthrottle/agentic-hooks';
import { describe, expect, it, vi } from 'vitest';

import {
  USER_ENV_FILE_CONFIG_DIR_ENV,
  USER_ENV_FILE_HEALTH,
  USER_ENV_FILE_SKIP_REASONS,
} from './user-env-file.constants.ts';
import type { EnsureUserEnvFileParams } from './user-env-file.types.ts';
import {
  assessUserEnvFile,
  ensureUserEnvFile,
  isUserEnvFileUnhealthy,
  readInspectedToken,
  resolveUserEnvFilePlan,
  resolveUserEnvFileScope,
} from './user-env-file.utils.ts';

const TOKEN = 'ot_sa_abc_secret';
const PRIMARY_ENV = { OPENTHROTTLE_MCP_AUTH_TOKEN: TOKEN };

const noFiles = (): boolean => {
  return false;
};

const dockerFiles = (path: string): boolean => {
  return path === '/.dockerenv';
};

describe('resolveUserEnvFilePlan', () => {
  describe('on the primary server', () => {
    it('writes the loopback URL for its own port and the MCP token', () => {
      const plan = resolveUserEnvFilePlan({
        env: PRIMARY_ENV,
        fileExists: noFiles,
        port: 6021,
        tokenOverride: undefined,
      });

      expect(plan).toEqual({
        configDir: undefined,
        entries: {
          authToken: TOKEN,
          graphqlUrl: 'http://127.0.0.1:6021/graphql',
        },
        kind: 'write',
      });
    });
  });

  describe('on a worktree server', () => {
    it.each(['shared', 'isolated'])('skips with OT_WORKTREE_DB=%s', (mode) => {
      const plan = resolveUserEnvFilePlan({
        env: { ...PRIMARY_ENV, OT_WORKTREE_DB: mode },
        fileExists: noFiles,
        port: 7011,
        tokenOverride: undefined,
      });

      expect(plan).toEqual({
        kind: 'skip',
        reason: USER_ENV_FILE_SKIP_REASONS.WORKTREE,
      });
    });
  });

  describe('in a container', () => {
    it('skips when a container marker exists and no host dir is mounted', () => {
      const plan = resolveUserEnvFilePlan({
        env: PRIMARY_ENV,
        fileExists: dockerFiles,
        port: 6021,
        tokenOverride: undefined,
      });

      expect(plan).toEqual({
        kind: 'skip',
        reason: USER_ENV_FILE_SKIP_REASONS.CONTAINER,
      });
    });

    it('writes into the mounted host dir when one is named', () => {
      const plan = resolveUserEnvFilePlan({
        env: { ...PRIMARY_ENV, [USER_ENV_FILE_CONFIG_DIR_ENV]: '/host-ot' },
        fileExists: dockerFiles,
        port: 6021,
        tokenOverride: undefined,
      });

      expect(plan).toMatchObject({ configDir: '/host-ot', kind: 'write' });
    });
  });

  describe('when inputs are missing', () => {
    it('skips without a token', () => {
      const plan = resolveUserEnvFilePlan({
        env: { OPENTHROTTLE_MCP_AUTH_TOKEN: '  ' },
        fileExists: noFiles,
        port: 6021,
        tokenOverride: undefined,
      });

      expect(plan).toMatchObject({
        reason: USER_ENV_FILE_SKIP_REASONS.NO_TOKEN,
      });
    });

    it('skips without a usable port', () => {
      const plan = resolveUserEnvFilePlan({
        env: PRIMARY_ENV,
        fileExists: noFiles,
        port: Number.NaN,
        tokenOverride: undefined,
      });

      expect(plan).toMatchObject({
        reason: USER_ENV_FILE_SKIP_REASONS.NO_PORT,
      });
    });
  });
});

describe('resolveUserEnvFilePlan with a token override', () => {
  it('writes the freshly minted token instead of the environment one', () => {
    const plan = resolveUserEnvFilePlan({
      env: PRIMARY_ENV,
      fileExists: noFiles,
      port: 6021,
      tokenOverride: 'ot_sa_new_secret',
    });
    expect(plan).toMatchObject({
      entries: { authToken: 'ot_sa_new_secret' },
      kind: 'write',
    });
  });

  it('works on a server whose own env has no token', () => {
    const plan = resolveUserEnvFilePlan({
      env: {},
      fileExists: noFiles,
      port: 6021,
      tokenOverride: 'ot_sa_new_secret',
    });
    expect(plan.kind).toBe('write');
  });

  it('still skips a worktree server', () => {
    const plan = resolveUserEnvFilePlan({
      env: { OT_WORKTREE_DB: 'shared' },
      fileExists: noFiles,
      port: 7011,
      tokenOverride: 'ot_sa_new_secret',
    });
    expect(plan).toEqual({
      kind: 'skip',
      reason: USER_ENV_FILE_SKIP_REASONS.WORKTREE,
    });
  });

  it('falls back to the environment token for a blank override', () => {
    const plan = resolveUserEnvFilePlan({
      env: PRIMARY_ENV,
      fileExists: noFiles,
      port: 6021,
      tokenOverride: ' ',
    });
    expect(plan).toMatchObject({ entries: { authToken: TOKEN } });
  });
});

describe('ensureUserEnvFile', () => {
  const setup = (
    result: EnsureUserEnvEntriesResult,
    env: NodeJS.ProcessEnv = PRIMARY_ENV,
  ) => {
    const ensure = vi.fn<EnsureUserEnvFileParams['ensure']>(() => {
      return result;
    });
    const logger = { info: vi.fn(), warn: vi.fn() };
    const params: EnsureUserEnvFileParams = {
      ensure,
      env,
      fileExists: noFiles,
      logger,
      port: 6021,
      tokenOverride: undefined,
    };
    return { ensure, logger, params };
  };

  const SUCCESS = {
    changed: true,
    endpoint: 'added',
    envPath: '/home/u/.openthrottle/.env',
    ok: true,
    token: 'refreshed',
  } as const;

  it('calls the writer with the plan and logs one line on a write', () => {
    const { ensure, logger, params } = setup(SUCCESS);

    ensureUserEnvFile(params);

    expect(ensure).toHaveBeenCalledWith(
      { authToken: TOKEN, graphqlUrl: 'http://127.0.0.1:6021/graphql' },
      undefined,
    );
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('stays silent when the file is already current', () => {
    const { logger, params } = setup({ ...SUCCESS, changed: false });

    ensureUserEnvFile(params);

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns once when the writer fails', () => {
    const { logger, params } = setup({
      envPath: '/home/u/.openthrottle/.env',
      error: 'EACCES',
      ok: false,
    });

    ensureUserEnvFile(params);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('never calls the writer on a worktree server', () => {
    const { ensure, logger, params } = setup(SUCCESS, {
      ...PRIMARY_ENV,
      OT_WORKTREE_DB: 'shared',
    });

    ensureUserEnvFile(params);

    expect(ensure).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not throw when the writer itself throws', () => {
    const { logger, params } = setup(SUCCESS);
    const throwing = {
      ...params,
      ensure: (): EnsureUserEnvEntriesResult => {
        throw new Error('boom');
      },
    };

    expect(() => {
      ensureUserEnvFile(throwing);
    }).not.toThrow();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});

describe('resolveUserEnvFileScope', () => {
  it('names the loopback endpoint and config dir on the primary server', () => {
    expect(
      resolveUserEnvFileScope({
        env: { [USER_ENV_FILE_CONFIG_DIR_ENV]: '/cfg' },
        fileExists: noFiles,
        port: 6021,
      }),
    ).toEqual({
      configDir: '/cfg',
      graphqlUrl: 'http://127.0.0.1:6021/graphql',
      kind: 'applicable',
    });
  });

  it('does not need a token', () => {
    expect(
      resolveUserEnvFileScope({ env: {}, fileExists: noFiles, port: 6021 })
        .kind,
    ).toBe('applicable');
  });

  it('skips a worktree server', () => {
    expect(
      resolveUserEnvFileScope({
        env: { OT_WORKTREE_DB: 'shared' },
        fileExists: noFiles,
        port: 7011,
      }),
    ).toEqual({ kind: 'skip', reason: USER_ENV_FILE_SKIP_REASONS.WORKTREE });
  });
});

describe('assessUserEnvFile', () => {
  const URL = 'http://127.0.0.1:6021/graphql';
  const managed = (value: string) => {
    return { kind: 'managed', value } as const;
  };

  describe('when the file is unreadable', () => {
    it('reports both concerns unreadable', () => {
      expect(
        assessUserEnvFile({
          graphqlUrl: URL,
          inspection: { envPath: '/x/.env', error: 'EACCES', ok: false },
          tokenActive: false,
        }),
      ).toEqual({
        endpoint: USER_ENV_FILE_HEALTH.UNREADABLE,
        token: USER_ENV_FILE_HEALTH.UNREADABLE,
      });
    });
  });

  describe('when the file is readable', () => {
    it('is ok for this server and an active token', () => {
      expect(
        assessUserEnvFile({
          graphqlUrl: URL,
          inspection: {
            endpoint: managed('http://localhost:6021/graphql/'),
            envPath: '/x/.env',
            ok: true,
            token: managed(TOKEN),
          },
          tokenActive: true,
        }),
      ).toEqual({
        endpoint: USER_ENV_FILE_HEALTH.OK,
        token: USER_ENV_FILE_HEALTH.OK,
      });
    });

    it('is stale for another port and a dead token', () => {
      expect(
        assessUserEnvFile({
          graphqlUrl: URL,
          inspection: {
            endpoint: managed('http://127.0.0.1:7011/graphql'),
            envPath: '/x/.env',
            ok: true,
            token: managed(TOKEN),
          },
          tokenActive: false,
        }),
      ).toEqual({
        endpoint: USER_ENV_FILE_HEALTH.STALE,
        token: USER_ENV_FILE_HEALTH.STALE,
      });
    });

    it('is missing when the file has neither line', () => {
      expect(
        assessUserEnvFile({
          graphqlUrl: URL,
          inspection: {
            endpoint: { kind: 'missing' },
            envPath: '/x/.env',
            ok: true,
            token: { kind: 'missing' },
          },
          tokenActive: false,
        }),
      ).toEqual({
        endpoint: USER_ENV_FILE_HEALTH.MISSING,
        token: USER_ENV_FILE_HEALTH.MISSING,
      });
    });

    it('trusts a user-set endpoint but still checks a user-set token', () => {
      const userSet = {
        endpoint: { kind: 'user_set', value: 'https://ot.example.com/graphql' },
        envPath: '/x/.env',
        ok: true,
        token: { kind: 'user_set', value: TOKEN },
      } as const;
      expect(
        assessUserEnvFile({ graphqlUrl: URL, inspection: userSet, tokenActive: true }), // prettier-ignore
      ).toEqual({
        endpoint: USER_ENV_FILE_HEALTH.USER_SET,
        token: USER_ENV_FILE_HEALTH.USER_SET,
      });
      expect(
        assessUserEnvFile({ graphqlUrl: URL, inspection: userSet, tokenActive: false }).token, // prettier-ignore
      ).toBe(USER_ENV_FILE_HEALTH.STALE);
    });
  });
});

describe('readInspectedToken', () => {
  it('returns a managed or user-set token and nothing otherwise', () => {
    const base = { endpoint: { kind: 'missing' }, envPath: '/x', ok: true } as const; // prettier-ignore
    expect(readInspectedToken({ ...base, token: { kind: 'managed', value: 'a' } })).toBe('a'); // prettier-ignore
    expect(readInspectedToken({ ...base, token: { kind: 'user_set', value: 'b' } })).toBe('b'); // prettier-ignore
    expect(readInspectedToken({ ...base, token: { kind: 'missing' } })).toBeUndefined(); // prettier-ignore
    expect(readInspectedToken({ envPath: '/x', error: 'e', ok: false })).toBeUndefined(); // prettier-ignore
  });
});

describe('isUserEnvFileUnhealthy', () => {
  it('flags missing, stale and unreadable only', () => {
    const flagged = Object.values(USER_ENV_FILE_HEALTH).filter((status) => {
      return isUserEnvFileUnhealthy(status);
    });
    expect(flagged.sort()).toEqual(['missing', 'stale', 'unreadable']);
  });
});
