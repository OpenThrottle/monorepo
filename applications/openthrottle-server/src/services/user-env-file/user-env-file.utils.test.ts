import type { EnsureUserEnvEntriesResult } from '@openthrottle/agentic-hooks';
import { describe, expect, it, vi } from 'vitest';

import {
  USER_ENV_FILE_CONFIG_DIR_ENV,
  USER_ENV_FILE_SKIP_REASONS,
} from './user-env-file.constants.ts';
import type { EnsureUserEnvFileOnBootParams } from './user-env-file.types.ts';
import {
  ensureUserEnvFileOnBoot,
  resolveUserEnvFilePlan,
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
      });

      expect(plan).toMatchObject({
        reason: USER_ENV_FILE_SKIP_REASONS.NO_PORT,
      });
    });
  });
});

describe('ensureUserEnvFileOnBoot', () => {
  const setup = (
    result: EnsureUserEnvEntriesResult,
    env: NodeJS.ProcessEnv = PRIMARY_ENV,
  ) => {
    const ensure = vi.fn<EnsureUserEnvFileOnBootParams['ensure']>(() => {
      return result;
    });
    const logger = { info: vi.fn(), warn: vi.fn() };
    const params: EnsureUserEnvFileOnBootParams = {
      ensure,
      env,
      fileExists: noFiles,
      logger,
      port: 6021,
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

    ensureUserEnvFileOnBoot(params);

    expect(ensure).toHaveBeenCalledWith(
      { authToken: TOKEN, graphqlUrl: 'http://127.0.0.1:6021/graphql' },
      undefined,
    );
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('stays silent when the file is already current', () => {
    const { logger, params } = setup({ ...SUCCESS, changed: false });

    ensureUserEnvFileOnBoot(params);

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns once when the writer fails', () => {
    const { logger, params } = setup({
      envPath: '/home/u/.openthrottle/.env',
      error: 'EACCES',
      ok: false,
    });

    ensureUserEnvFileOnBoot(params);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('never calls the writer on a worktree server', () => {
    const { ensure, logger, params } = setup(SUCCESS, {
      ...PRIMARY_ENV,
      OT_WORKTREE_DB: 'shared',
    });

    ensureUserEnvFileOnBoot(params);

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
      ensureUserEnvFileOnBoot(throwing);
    }).not.toThrow();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
