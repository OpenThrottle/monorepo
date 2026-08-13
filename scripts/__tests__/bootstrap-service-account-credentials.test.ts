import { asMock } from '@openthrottle/nestjs-testing';
import type { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The SUT pulls in TypeORM + repository entities at import time; stub those
// modules so importing it stays cheap and never touches a DB. provisionAccount
// only ever calls the injected fakes below, so the stub identities are unused.
vi.mock('typeorm', () => ({
  DataSource: class {},
  IsNull: () => undefined,
}));

vi.mock('@openthrottle/nestjs-repositories', () => ({
  ServiceAccount: class {},
  ServiceAccountCredential: class {},
  ServiceAccountsService: class {},
  getOpenThrottleTypeOrmOptions: () => ({}),
}));

vi.mock('../local-secrets-file.ts', () => ({
  LOCAL_SECRETS_FILENAME: '.bootstrap-secrets.local',
  readLocalSecrets: vi.fn(),
  upsertLocalSecrets: vi.fn(),
}));

import { readLocalSecrets, upsertLocalSecrets } from '../local-secrets-file.ts';
import {
  BOOTSTRAP_ACCOUNTS,
  provisionAccount,
} from '../bootstrap-service-account-credentials.ts';

const readLocalSecretsMock = vi.mocked(readLocalSecrets);
const upsertLocalSecretsMock = vi.mocked(upsertLocalSecrets);

const MCP_ACCOUNT = BOOTSTRAP_ACCOUNTS[0];
const MCP_KEY = MCP_ACCOUNT.envVar;

type ServiceOverrides = {
  activeCredentialIds?: string[];
  createdToken?: string;
  upsertAction?: 'created' | 'noop' | 'updated';
};

/** A ServiceAccountsService fake exposing only the methods provisionAccount uses. */
function makeService(overrides: ServiceOverrides = {}) {
  const createCredential = vi.fn().mockResolvedValue({
    credential: { id: 'new' },
    token: overrides.createdToken ?? 'ot_sa_minted_token',
  });
  const findActiveCredentials = vi
    .fn()
    .mockResolvedValue(
      (overrides.activeCredentialIds ?? []).map((id) => ({ id })),
    );
  const revokeCredential = vi.fn().mockResolvedValue(true);
  const upsertCredentialForToken = vi
    .fn()
    .mockResolvedValue({ action: overrides.upsertAction ?? 'created' });

  return {
    createCredential,
    findActiveCredentials,
    revokeCredential,
    upsertCredentialForToken,
  };
}

/** A DataSource fake whose single repo answers findOne (account row) + count. */
function makeDataSource(opts: {
  accountId: string | null;
  activeCount: number;
}): DataSource {
  const repo = {
    count: vi.fn().mockResolvedValue(opts.activeCount),
    findOne: vi
      .fn()
      .mockResolvedValue(
        opts.accountId == null ? null : { id: opts.accountId },
      ),
  };

  return asMock<DataSource>({ getRepository: () => repo });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env[MCP_KEY];
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('provisionAccount — mint branch (no active credential)', () => {
  it('mints and writes the token to the local file', async () => {
    const dataSource = makeDataSource({ accountId: 'sa-1', activeCount: 0 });
    const service = makeService({ createdToken: 'ot_sa_fresh' });

    const outcome = await provisionAccount(
      dataSource,
      asMock(service),
      MCP_ACCOUNT,
    );

    expect(outcome).toBe('minted');
    expect(service.createCredential).toHaveBeenCalledOnce();
    expect(upsertLocalSecretsMock).toHaveBeenCalledWith({
      [MCP_KEY]: 'ot_sa_fresh',
    });
  });
});

describe('provisionAccount — env-provided branch', () => {
  it('persists the env token to the local file after upsert', async () => {
    process.env[MCP_KEY] = 'ot_sa_env_token';
    const dataSource = makeDataSource({ accountId: 'sa-1', activeCount: 0 });
    const service = makeService({ upsertAction: 'created' });

    const outcome = await provisionAccount(
      dataSource,
      asMock(service),
      MCP_ACCOUNT,
    );

    expect(outcome).toBe('created');
    expect(service.upsertCredentialForToken).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'ot_sa_env_token' }),
    );
    expect(upsertLocalSecretsMock).toHaveBeenCalledWith({
      [MCP_KEY]: 'ot_sa_env_token',
    });
  });
});

describe('provisionAccount — skip branch (active credential exists)', () => {
  it('rotates when the key is absent from the file: revoke + mint + write', async () => {
    readLocalSecretsMock.mockResolvedValue({});
    const dataSource = makeDataSource({ accountId: 'sa-1', activeCount: 1 });
    const service = makeService({
      activeCredentialIds: ['old-1', 'old-2'],
      createdToken: 'ot_sa_rotated',
    });

    const outcome = await provisionAccount(
      dataSource,
      asMock(service),
      MCP_ACCOUNT,
    );

    expect(outcome).toBe('rotated');
    expect(service.revokeCredential).toHaveBeenCalledTimes(2);
    expect(service.createCredential).toHaveBeenCalledOnce();
    expect(upsertLocalSecretsMock).toHaveBeenCalledWith({
      [MCP_KEY]: 'ot_sa_rotated',
    });
  });

  it('is a clean no-op when the key is already recorded', async () => {
    readLocalSecretsMock.mockResolvedValue({ [MCP_KEY]: 'ot_sa_existing' });
    const dataSource = makeDataSource({ accountId: 'sa-1', activeCount: 1 });
    const service = makeService({ activeCredentialIds: ['old-1'] });

    const outcome = await provisionAccount(
      dataSource,
      asMock(service),
      MCP_ACCOUNT,
    );

    expect(outcome).toBe('skipped');
    expect(service.revokeCredential).not.toHaveBeenCalled();
    expect(service.createCredential).not.toHaveBeenCalled();
    expect(upsertLocalSecretsMock).not.toHaveBeenCalled();
  });
});
