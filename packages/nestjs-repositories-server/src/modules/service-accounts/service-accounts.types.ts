import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { ServiceAccount } from './service-account.entity.ts';
import type { ServiceAccountsRepository } from './service-accounts.repository.ts';

/**
 * Scalar/column fields of ServiceAccount (no relations, no `deletedAt`).
 * @public
 */
export type ServiceAccountData = Pick<
  ServiceAccount,
  'actingUserId' | 'createdAt' | 'description' | 'disabledAt' | 'id' | 'name'
>;

/**
 * @description What `ServiceAccountsRepository.create` takes: the account's columns, with the
 * role and credential relations left out and the nullable columns optional. `name` is
 * required.
 * @public
 */
export interface ServiceAccountCreateInput
  extends
    Omit<
      CreateModelInput<ServiceAccount>,
      'actingUserId' | 'credentials' | 'description' | 'disabledAt' | 'roles'
    >,
    Partial<
      Pick<
        CreateModelInput<ServiceAccount>,
        'actingUserId' | 'description' | 'disabledAt'
      >
    > {}

/**
 * @description A {@link ServiceAccountsRepository} mock: every inherited `BaseRepository`
 * method plus the service-account ones.
 * @public
 */
export interface ServiceAccountsRepositoryMock extends BaseRepositoryMock<
  ServiceAccount,
  ServiceAccountCreateInput
> {
  readonly disable: Mock<ServiceAccountsRepository['disable']>;
  readonly enable: Mock<ServiceAccountsRepository['enable']>;
  readonly findAll: Mock<ServiceAccountsRepository['findAll']>;
  readonly findByName: Mock<ServiceAccountsRepository['findByName']>;
  readonly resolveActingUserId: Mock<
    ServiceAccountsRepository['resolveActingUserId']
  >;
}
