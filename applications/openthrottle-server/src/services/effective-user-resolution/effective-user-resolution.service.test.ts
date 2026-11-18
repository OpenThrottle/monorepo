import { createMock } from '@golevelup/ts-vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  ServiceAccountsRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  ServiceAccountsRepositoryMock,
  UsersRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createServiceAccountsRepositoryMock,
  createUsersRepositoryMock,
  usersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { EffectiveUserResolutionService } from './effective-user-resolution.service.ts';

const userId = '11111111-1111-4111-8111-111111111111';
const serviceAccountId = '22222222-2222-4222-8222-222222222222';
const actingUserId = '33333333-3333-4333-8333-333333333333';

describe('EffectiveUserResolutionService', () => {
  let service: EffectiveUserResolutionService;
  let serviceAccounts: ServiceAccountsRepositoryMock;
  let users: UsersRepositoryMock;

  beforeEach(async () => {
    serviceAccounts = createServiceAccountsRepositoryMock();
    users = createUsersRepositoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EffectiveUserResolutionService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: ServiceAccountsRepository,
          useValue: serviceAccounts,
        },
        {
          provide: UsersRepository,
          useValue: users,
        },
      ],
    }).compile();

    service = module.get(EffectiveUserResolutionService);
  });

  it('passes a user sub through unchanged', async () => {
    users.findOne.mockResolvedValue(usersFactory.build({ id: userId }));

    expect(await service.resolveEffectiveUserId(userId)).toBe(userId);
    expect(serviceAccounts.resolveActingUserId).not.toHaveBeenCalled();
  });

  it('resolves a service-account sub to its acting user', async () => {
    serviceAccounts.resolveActingUserId.mockResolvedValue(actingUserId);

    expect(await service.resolveEffectiveUserId(serviceAccountId)).toBe(
      actingUserId,
    );
    expect(serviceAccounts.resolveActingUserId).toHaveBeenCalledWith(
      serviceAccountId,
    );
  });

  it('resolves to null for an unlinked service account', async () => {
    serviceAccounts.resolveActingUserId.mockResolvedValue(null);

    expect(await service.resolveEffectiveUserId(serviceAccountId)).toBeNull();
  });

  it('resolves to null for empty, null, and undefined subs', async () => {
    expect(await service.resolveEffectiveUserId('')).toBeNull();
    expect(await service.resolveEffectiveUserId('   ')).toBeNull();
    expect(await service.resolveEffectiveUserId(null)).toBeNull();
    expect(await service.resolveEffectiveUserId(undefined)).toBeNull();
    expect(users.findOne).not.toHaveBeenCalled();
  });

  it('resolves to null instead of throwing when a lookup fails', async () => {
    users.findOne.mockRejectedValue(new Error('db down'));

    expect(await service.resolveEffectiveUserId(userId)).toBeNull();
  });
});
