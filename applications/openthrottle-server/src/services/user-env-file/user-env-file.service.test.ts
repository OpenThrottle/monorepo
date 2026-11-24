import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@openthrottle/agentic-hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openthrottle/agentic-hooks')>(); // prettier-ignore
  return {
    ...actual,
    ensureUserEnvEntries: vi.fn(),
    inspectUserEnvEntries: vi.fn(),
  };
});

vi.mock('./user-env-file.utils.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./user-env-file.utils.ts')>(); // prettier-ignore
  return { ...actual, ensureUserEnvFile: vi.fn() };
});

import {
  ensureUserEnvEntries,
  inspectUserEnvEntries,
} from '@openthrottle/agentic-hooks';
import { ServiceAccountCredentialsRepository } from '@openthrottle/nestjs-repositories-server';
import { createServiceAccountCredentialsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';

import { UserEnvFileService } from './user-env-file.service.ts';
import { ensureUserEnvFile } from './user-env-file.utils.ts';

const ensureUserEnvFileMock = vi.mocked(ensureUserEnvFile);
const inspectMock = vi.mocked(inspectUserEnvEntries);

describe('UserEnvFileService', () => {
  let service: UserEnvFileService;
  const logger = { info: vi.fn(), warn: vi.fn() };
  const credentials = createServiceAccountCredentialsRepositoryMock();

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('OT_WORKTREE_DB', undefined);
    vi.stubEnv('OPENTHROTTLE_USER_CONFIG_DIR', '/cfg');
    const app = await Test.createTestingModule({
      providers: [
        UserEnvFileService,
        { provide: ConfigService, useValue: { get: vi.fn(() => '6021') } },
        { provide: LoggerService, useValue: logger },
        {
          provide: ServiceAccountCredentialsRepository,
          useValue: credentials,
        },
      ],
    }).compile();
    service = app.get(UserEnvFileService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('onCredentialMinted', () => {
    it('writes a new openthrottle-mcp token for this server port', () => {
      service.onCredentialMinted('openthrottle-mcp', 'ot_sa_new_secret');

      expect(ensureUserEnvFileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ensure: ensureUserEnvEntries,
          logger,
          port: 6021,
          tokenOverride: 'ot_sa_new_secret',
        }),
      );
    });

    it('ignores a credential for any other account', () => {
      service.onCredentialMinted('plan-runner', 'ot_sa_other');

      expect(ensureUserEnvFileMock).not.toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('is not_applicable on a worktree server and reads nothing', async () => {
      vi.stubEnv('OT_WORKTREE_DB', 'shared');

      await expect(service.getHealth()).resolves.toEqual({
        endpoint: 'not_applicable',
        token: 'not_applicable',
      });
      expect(inspectMock).not.toHaveBeenCalled();
    });

    it('checks the file token read-only and grades both lines', async () => {
      inspectMock.mockReturnValue({
        endpoint: { kind: 'managed', value: 'http://127.0.0.1:6021/graphql' },
        envPath: '/cfg/.env',
        ok: true,
        token: { kind: 'managed', value: 'ot_sa_file_token' },
      });
      credentials.isActiveToken.mockResolvedValue(true);

      await expect(service.getHealth()).resolves.toEqual({
        endpoint: 'ok',
        token: 'ok',
      });
      expect(inspectMock).toHaveBeenCalledWith('/cfg');
      expect(credentials.isActiveToken).toHaveBeenCalledWith(
        'ot_sa_file_token',
      );
      expect(credentials.verifyBearerToken).not.toHaveBeenCalled();
    });
  });

  describe('logBootHealth', () => {
    it('warns once, without the token, when the token is stale', async () => {
      inspectMock.mockReturnValue({
        endpoint: { kind: 'managed', value: 'http://127.0.0.1:6021/graphql' },
        envPath: '/cfg/.env',
        ok: true,
        token: { kind: 'managed', value: 'ot_sa_file_token' },
      });
      credentials.isActiveToken.mockResolvedValue(false);

      await service.logBootHealth();

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(String(logger.warn.mock.calls[0]?.[0])).toContain('token: stale');
      expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('ot_sa_file_token'); // prettier-ignore
    });

    it('stays silent when the file is healthy', async () => {
      inspectMock.mockReturnValue({
        endpoint: { kind: 'user_set', value: 'https://ot.example.com/graphql' },
        envPath: '/cfg/.env',
        ok: true,
        token: { kind: 'managed', value: 'ot_sa_file_token' },
      });
      credentials.isActiveToken.mockResolvedValue(true);

      await service.logBootHealth();

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('turns a failure into one warning', async () => {
      inspectMock.mockReturnValue({
        endpoint: { kind: 'missing' },
        envPath: '/cfg/.env',
        ok: true,
        token: { kind: 'managed', value: 'ot_sa_file_token' },
      });
      credentials.isActiveToken.mockRejectedValue(new Error('db down'));

      await expect(service.logBootHealth()).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });
  });
});
