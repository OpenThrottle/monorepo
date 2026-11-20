import { createMock } from '@golevelup/ts-vitest';
import type { EnsureUserEnvEntriesResult } from '@openthrottle/agentic-hooks';
import type {
  ServiceAccountCredential,
  ServiceAccountCredentialsRepository,
  ServiceAccountsRepository,
} from '@openthrottle/nestjs-repositories-server';
import { serviceAccountsFactory } from '@openthrottle/nestjs-repositories-server/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  USER_ENV_FILE_CONFIG_DIR_ENV,
  USER_ENV_FILE_SKIP_REASONS,
} from './user-env-file.constants.ts';
import type { EnsureUserEnvFileOnBootParams } from './user-env-file.types.ts';
import {
  ensureUserEnvFileOnBoot,
  provisionTelemetryIngestToken,
  resolveUserEnvFilePlan,
} from './user-env-file.utils.ts';

const TOKEN = 'ot_sa_abc_secret';
const SCOPED_TOKEN = 'ot_sa_scoped_child';
const PRIMARY_ENV = { OPENTHROTTLE_MCP_AUTH_TOKEN: TOKEN };

const noFiles = (): boolean => {
  return false;
};

const dockerFiles = (path: string): boolean => {
  return path === '/.dockerenv';
};

describe('resolveUserEnvFilePlan', () => {
  describe('on the primary server', () => {
    it('plans the loopback URL for its own port with the MCP token as parent', () => {
      const plan = resolveUserEnvFilePlan({
        env: PRIMARY_ENV,
        fileExists: noFiles,
        port: 6021,
      });

      expect(plan).toEqual({
        configDir: undefined,
        graphqlUrl: 'http://127.0.0.1:6021/graphql',
        kind: 'write',
        parentToken: TOKEN,
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
    const provisionTelemetryToken = vi.fn<
      EnsureUserEnvFileOnBootParams['provisionTelemetryToken']
    >(async () => {
      return { kind: 'provisioned', token: SCOPED_TOKEN };
    });
    const params: EnsureUserEnvFileOnBootParams = {
      ensure,
      env,
      fileExists: noFiles,
      logger,
      port: 6021,
      provisionTelemetryToken,
    };
    return { ensure, logger, params, provisionTelemetryToken };
  };

  const SUCCESS = {
    changed: true,
    endpoint: 'added',
    envPath: '/home/u/.openthrottle/.env',
    ok: true,
    token: 'refreshed',
  } as const;

  it('writes the provisioned telemetry token, never the MCP token', async () => {
    const { ensure, logger, params, provisionTelemetryToken } = setup(SUCCESS);

    await ensureUserEnvFileOnBoot(params);

    expect(provisionTelemetryToken).toHaveBeenCalledWith(TOKEN);
    expect(ensure).toHaveBeenCalledWith(
      { authToken: SCOPED_TOKEN, graphqlUrl: 'http://127.0.0.1:6021/graphql' },
      undefined,
    );
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('writes nothing and warns once when provisioning fails', async () => {
    const { ensure, logger, params, provisionTelemetryToken } = setup(SUCCESS);
    provisionTelemetryToken.mockResolvedValue({
      kind: 'failed',
      reason: 'openthrottle-mcp missing',
    });

    await ensureUserEnvFileOnBoot(params);

    expect(ensure).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('does not throw when provisioning rejects', async () => {
    const { ensure, logger, params, provisionTelemetryToken } = setup(SUCCESS);
    provisionTelemetryToken.mockRejectedValue(new Error('db down'));

    await expect(ensureUserEnvFileOnBoot(params)).resolves.toBeUndefined();

    expect(ensure).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('stays silent when the file is already current', async () => {
    const { logger, params } = setup({ ...SUCCESS, changed: false });

    await ensureUserEnvFileOnBoot(params);

    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('warns once when the writer fails', async () => {
    const { logger, params } = setup({
      envPath: '/home/u/.openthrottle/.env',
      error: 'EACCES',
      ok: false,
    });

    await ensureUserEnvFileOnBoot(params);

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('never provisions or writes on a worktree server', async () => {
    const { ensure, logger, params, provisionTelemetryToken } = setup(SUCCESS, {
      ...PRIMARY_ENV,
      OT_WORKTREE_DB: 'shared',
    });

    await ensureUserEnvFileOnBoot(params);

    expect(provisionTelemetryToken).not.toHaveBeenCalled();
    expect(ensure).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('does not throw when the writer itself throws', async () => {
    const { logger, params } = setup(SUCCESS);
    const throwing = {
      ...params,
      ensure: (): EnsureUserEnvEntriesResult => {
        throw new Error('boom');
      },
    };

    await expect(ensureUserEnvFileOnBoot(throwing)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});

describe('provisionTelemetryIngestToken', () => {
  const setup = (accountId: string | null) => {
    const findByName = vi.fn<ServiceAccountsRepository['findByName']>(
      async () => {
        return accountId == null
          ? null
          : serviceAccountsFactory.build({ id: accountId });
      },
    );
    const upsertTelemetryIngestCredential = vi.fn<
      ServiceAccountCredentialsRepository['upsertTelemetryIngestCredential']
    >(async () => {
      return {
        action: 'created',
        credential: createMock<ServiceAccountCredential>(),
        token: SCOPED_TOKEN,
      };
    });
    return {
      findByName,
      params: {
        credentials: { upsertTelemetryIngestCredential },
        parentToken: TOKEN,
        serviceAccounts: { findByName },
      },
      upsertTelemetryIngestCredential,
    };
  };

  it('provisions on the openthrottle-mcp account and returns the child token', async () => {
    const { findByName, params, upsertTelemetryIngestCredential } =
      setup('sa-1');

    await expect(provisionTelemetryIngestToken(params)).resolves.toEqual({
      kind: 'provisioned',
      token: SCOPED_TOKEN,
    });
    expect(findByName).toHaveBeenCalledWith('openthrottle-mcp');
    expect(upsertTelemetryIngestCredential).toHaveBeenCalledWith({
      parentToken: TOKEN,
      serviceAccountId: 'sa-1',
    });
  });

  it('fails without the openthrottle-mcp account', async () => {
    const { params, upsertTelemetryIngestCredential } = setup(null);

    await expect(provisionTelemetryIngestToken(params)).resolves.toMatchObject({
      kind: 'failed',
    });
    expect(upsertTelemetryIngestCredential).not.toHaveBeenCalled();
  });

  it('fails when the account is disabled', async () => {
    const { params, upsertTelemetryIngestCredential } = setup('sa-1');
    upsertTelemetryIngestCredential.mockResolvedValue(null);

    await expect(provisionTelemetryIngestToken(params)).resolves.toMatchObject({
      kind: 'failed',
    });
  });
});
