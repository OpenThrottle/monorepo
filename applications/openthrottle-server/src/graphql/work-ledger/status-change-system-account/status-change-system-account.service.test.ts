import { createMock } from '@golevelup/ts-vitest';
import type { ServiceAccountsRepository } from '@openthrottle/nestjs-repositories-server';
import type { ServiceAccountsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createServiceAccountsRepositoryMock,
  serviceAccountsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME } from './status-change-system-account.constants.ts';
import { StatusChangeSystemAccountService } from './status-change-system-account.service.ts';

describe('StatusChangeSystemAccountService', () => {
  let serviceAccounts: ServiceAccountsRepositoryMock;
  let service: StatusChangeSystemAccountService;

  beforeEach(() => {
    serviceAccounts = createServiceAccountsRepositoryMock();
    service = new StatusChangeSystemAccountService(
      createMock<ServiceAccountsRepository>(serviceAccounts),
    );
  });

  it('resolves the id of the seeded account by name', async () => {
    serviceAccounts.findByName.mockResolvedValue(
      serviceAccountsFactory.build({
        id: 'system-account-1',
        name: STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME,
      }),
    );

    const id = await service.resolveId();

    expect(id).toBe('system-account-1');
    expect(serviceAccounts.findByName).toHaveBeenCalledWith(
      STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME,
    );
  });

  it('memoises the lookup so a second call does not query again', async () => {
    serviceAccounts.findByName.mockResolvedValue(
      serviceAccountsFactory.build({
        id: 'system-account-1',
        name: STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME,
      }),
    );

    await service.resolveId();
    await service.resolveId();

    expect(serviceAccounts.findByName).toHaveBeenCalledTimes(1);
  });

  it('returns null when the account is missing (e.g. migration not yet run)', async () => {
    serviceAccounts.findByName.mockResolvedValue(null);

    const id = await service.resolveId();

    expect(id).toBeNull();
  });

  it('does not cache a null, so a process that booted ahead of its migrations recovers', async () => {
    serviceAccounts.findByName.mockResolvedValueOnce(null);
    serviceAccounts.findByName.mockResolvedValue(
      serviceAccountsFactory.build({
        id: 'system-account-1',
        name: STATUS_CHANGE_SYSTEM_SERVICE_ACCOUNT_NAME,
      }),
    );

    expect(await service.resolveId()).toBeNull();
    expect(await service.resolveId()).toBe('system-account-1');
  });
});
