import { createMock } from '@golevelup/ts-vitest';
import type {
  ServiceAccount,
  ServiceAccountsService,
} from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME,
  StatusChangeSystemAccountService,
} from './status-change-system-account.service.ts';

function buildAccount(id: string): ServiceAccount {
  return {
    actingUserId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    credentials: [],
    description: null,
    disabledAt: null,
    id,
    name: STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME,
    roles: [],
  };
}

describe('StatusChangeSystemAccountService', () => {
  let serviceAccountsService: ServiceAccountsService;
  let service: StatusChangeSystemAccountService;

  beforeEach(() => {
    serviceAccountsService = createMock<ServiceAccountsService>();
    service = new StatusChangeSystemAccountService(serviceAccountsService);
  });

  it('resolves the id of the seeded account by name', async () => {
    vi.mocked(serviceAccountsService.findByName).mockResolvedValue(
      buildAccount('system-account-1'),
    );

    const id = await service.resolveId();

    expect(id).toBe('system-account-1');
    expect(serviceAccountsService.findByName).toHaveBeenCalledWith(
      STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME,
    );
  });

  it('memoises the lookup so a second call does not query again', async () => {
    vi.mocked(serviceAccountsService.findByName).mockResolvedValue(
      buildAccount('system-account-1'),
    );

    await service.resolveId();
    await service.resolveId();

    expect(serviceAccountsService.findByName).toHaveBeenCalledTimes(1);
  });

  it('returns null when the account is missing (e.g. migration not yet run)', async () => {
    vi.mocked(serviceAccountsService.findByName).mockResolvedValue(null);

    const id = await service.resolveId();

    expect(id).toBeNull();
  });

  it('does not cache a null, so a process that booted ahead of its migrations recovers', async () => {
    vi.mocked(serviceAccountsService.findByName).mockResolvedValueOnce(null);
    vi.mocked(serviceAccountsService.findByName).mockResolvedValue(
      buildAccount('system-account-1'),
    );

    expect(await service.resolveId()).toBeNull();
    expect(await service.resolveId()).toBe('system-account-1');
  });
});
