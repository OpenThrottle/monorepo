import { NotFoundException } from '@nestjs/common';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { ServiceAccount } from './service-account.entity.ts';
import type {
  ServiceAccountCreateInput,
  ServiceAccountsRepositoryMock,
} from './service-accounts.types.ts';

/**
 * @description Builds a {@link ServiceAccountsRepositoryMock} that starts as an empty
 * `service_accounts` table (see `createBaseRepositoryMock`). `disable` and `enable` reject
 * with the not-found error, like the real repository on a missing id. Provide it in place of
 * `ServiceAccountsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createServiceAccountsRepositoryMock(): ServiceAccountsRepositoryMock {
  const notFound = (id: string): Promise<never> => {
    return Promise.reject(
      new NotFoundException(
        `service_accounts record with ID "${id}" not found`,
      ),
    );
  };

  return {
    ...createBaseRepositoryMock<ServiceAccount, ServiceAccountCreateInput>(
      'service_accounts',
    ),
    disable: vi.fn(notFound),
    enable: vi.fn(notFound),
    findAll: vi.fn(async () => {
      return [];
    }),
    findByName: vi.fn(async () => {
      return null;
    }),
    resolveActingUserId: vi.fn(async () => {
      return null;
    }),
  };
}
