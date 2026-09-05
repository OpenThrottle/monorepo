import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  ServiceAccountsService,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import type { User } from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { EffectiveUserResolutionService } from './effective-user-resolution.service';

const userId = '11111111-1111-4111-8111-111111111111';
const serviceAccountId = '22222222-2222-4222-8222-222222222222';
const actingUserId = '33333333-3333-4333-8333-333333333333';

describe('EffectiveUserResolutionService', () => {
  let service: EffectiveUserResolutionService;
  const findById = vi.fn();
  const resolveActingUserId = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    findById.mockResolvedValue(null);
    resolveActingUserId.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EffectiveUserResolutionService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: ServiceAccountsService,
          useValue: { resolveActingUserId },
        },
        {
          provide: UsersService,
          useValue: { findById },
        },
      ],
    }).compile();

    service = module.get(EffectiveUserResolutionService);
  });

  it('passes a user sub through unchanged', async () => {
    findById.mockResolvedValue(asMock<User>({ id: userId }));

    expect(await service.resolveEffectiveUserId(userId)).toBe(userId);
    expect(resolveActingUserId).not.toHaveBeenCalled();
  });

  it('resolves a service-account sub to its acting user', async () => {
    resolveActingUserId.mockResolvedValue(actingUserId);

    expect(await service.resolveEffectiveUserId(serviceAccountId)).toBe(
      actingUserId,
    );
    expect(resolveActingUserId).toHaveBeenCalledWith(serviceAccountId);
  });

  it('resolves to null for an unlinked service account', async () => {
    resolveActingUserId.mockResolvedValue(null);

    expect(await service.resolveEffectiveUserId(serviceAccountId)).toBeNull();
  });

  it('resolves to null for empty, null, and undefined subs', async () => {
    expect(await service.resolveEffectiveUserId('')).toBeNull();
    expect(await service.resolveEffectiveUserId('   ')).toBeNull();
    expect(await service.resolveEffectiveUserId(null)).toBeNull();
    expect(await service.resolveEffectiveUserId(undefined)).toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it('resolves to null instead of throwing when a lookup fails', async () => {
    findById.mockRejectedValue(new Error('db down'));

    expect(await service.resolveEffectiveUserId(userId)).toBeNull();
  });
});
