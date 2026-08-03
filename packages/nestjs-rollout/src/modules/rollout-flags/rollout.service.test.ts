import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { RolesService } from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { principalIdToBucket } from './rollout-flag.bucketing';
import {
  ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
  ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
  ROLLOUT_EVALUATION_REASON,
  ROLLOUT_FLAG_KIND,
} from './rollout-flag.constants';
import { RolloutFlag } from './rollout-flag.entity';
import { RolloutService } from './rollout.service';

/** Last 8 hex → parseInt % 100 === 53 (`11111111`). */
const userId = '11111111-1111-4111-8111-111111111111';
/** Last 8 hex → parseInt % 100 === 6 (`22222222`). */
const serviceAccountId = '22222222-2222-4222-8222-222222222222';
/** Last 8 hex `00000000` → bucket 0. */
const bucket0Id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaa00000000';
/** Last 8 hex `00000063` → bucket 99. */
const bucket99Id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbb00000063';

const userPrincipal: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: userId,
};
const serviceAccountPrincipal: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: serviceAccountId,
};

function flag(overrides: Partial<RolloutFlag> = {}): RolloutFlag {
  return asMock<RolloutFlag>({
    createdAt: new Date(),
    description: null,
    enabled: true,
    fallthrough: ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
    id: 'flag-1',
    key: 'new-dashboard',
    kind: ROLLOUT_FLAG_KIND.BOOLEAN,
    offVariation: 0,
    targetRoles: [],
    updatedAt: new Date(),
    variations: ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
    ...overrides,
  });
}

describe('RolloutService', () => {
  type FlagRepo = {
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    merge: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  let service: RolloutService;
  let repo: FlagRepo;
  let rolesService: {
    findRoleNamesByServiceAccountId: ReturnType<typeof vi.fn>;
    findRoleNamesByUserId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      create: vi.fn(),
      delete: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      merge: vi.fn(),
      save: vi.fn(),
    };
    rolesService = {
      findRoleNamesByServiceAccountId: vi.fn(),
      findRoleNamesByUserId: vi.fn(),
    };

    const app = await Test.createTestingModule({
      providers: [
        RolloutService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: getRepositoryToken(RolloutFlag), useValue: repo },
        {
          provide: RolesService,
          useValue: {
            ...createMock<RolesService>(),
            findRoleNamesByServiceAccountId:
              rolesService.findRoleNamesByServiceAccountId,
            findRoleNamesByUserId: rolesService.findRoleNamesByUserId,
          },
        },
      ],
    }).compile();

    service = app.get(RolloutService);
  });

  describe('principalIdToBucket', () => {
    it('maps known UUIDs to stable mod-100 buckets', () => {
      expect(principalIdToBucket(userId)).toBe(53);
      expect(principalIdToBucket(serviceAccountId)).toBe(6);
      expect(principalIdToBucket(bucket0Id)).toBe(0);
      expect(principalIdToBucket(bucket99Id)).toBe(99);
    });
  });

  describe('create', () => {
    it('creates a boolean flag with LD defaults when typed fields are omitted', async () => {
      const created = flag({ enabled: false, key: 'billing' });
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create({ key: 'billing' });

      expect(result).toBe(created);
      expect(repo.create).toHaveBeenCalledWith({
        description: null,
        enabled: false,
        fallthrough: ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
        key: 'billing',
        kind: ROLLOUT_FLAG_KIND.BOOLEAN,
        offVariation: 0,
        targetRoles: [],
        variations: ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
      });
    });

    it('throws ConflictException when the key already exists', async () => {
      repo.findOne.mockResolvedValue(flag({ key: 'billing' }));

      await expect(service.create({ key: 'billing' })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    describe('when typed config is invalid', () => {
      beforeEach(() => {
        repo.findOne.mockResolvedValue(null);
      });

      it('rejects fewer than two variations', async () => {
        await expect(
          service.create({
            fallthrough: { variations: [{ variation: 0, weight: 100 }] },
            key: 'bad',
            kind: ROLLOUT_FLAG_KIND.STRING,
            variations: [{ value: 'only' }],
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('rejects kind-mismatched variation values', async () => {
        await expect(
          service.create({
            fallthrough: { variations: [{ variation: 1, weight: 100 }] },
            key: 'bad',
            kind: ROLLOUT_FLAG_KIND.NUMBER,
            variations: [{ value: 'nope' }, { value: 2 }],
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('rejects fallthrough weights that do not sum to 100', async () => {
        await expect(
          service.create({
            fallthrough: {
              variations: [
                { variation: 0, weight: 40 },
                { variation: 1, weight: 40 },
              ],
            },
            key: 'bad',
            kind: ROLLOUT_FLAG_KIND.BOOLEAN,
            variations: ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });

      it('rejects offVariation out of range', async () => {
        await expect(
          service.create({
            fallthrough: ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
            key: 'bad',
            kind: ROLLOUT_FLAG_KIND.BOOLEAN,
            offVariation: 2,
            variations: ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
      });
    });

    it('persists string / number / json flags when valid', async () => {
      repo.findOne.mockResolvedValue(null);
      const stringFlag = flag({
        fallthrough: {
          variations: [
            { variation: 0, weight: 90 },
            { variation: 1, weight: 10 },
          ],
        },
        key: 'theme',
        kind: ROLLOUT_FLAG_KIND.STRING,
        variations: [{ value: 'control' }, { value: 'treatment' }],
      });
      repo.create.mockReturnValue(stringFlag);
      repo.save.mockResolvedValue(stringFlag);

      await service.create({
        fallthrough: {
          variations: [
            { variation: 0, weight: 90 },
            { variation: 1, weight: 10 },
          ],
        },
        key: 'theme',
        kind: ROLLOUT_FLAG_KIND.STRING,
        variations: [{ value: 'control' }, { value: 'treatment' }],
      });
      expect(repo.save).toHaveBeenCalled();

      const numberFlag = flag({
        fallthrough: { variations: [{ variation: 0, weight: 100 }] },
        key: 'timeout-ms',
        kind: ROLLOUT_FLAG_KIND.NUMBER,
        variations: [{ value: 100 }, { value: 200 }],
      });
      repo.create.mockReturnValue(numberFlag);
      repo.save.mockResolvedValue(numberFlag);
      await service.create({
        fallthrough: { variations: [{ variation: 0, weight: 100 }] },
        key: 'timeout-ms',
        kind: ROLLOUT_FLAG_KIND.NUMBER,
        variations: [{ value: 100 }, { value: 200 }],
      });

      const jsonFlag = flag({
        fallthrough: { variations: [{ variation: 1, weight: 100 }] },
        key: 'payload',
        kind: ROLLOUT_FLAG_KIND.JSON,
        variations: [{ value: { a: 1 } }, { value: [1, 2] }],
      });
      repo.create.mockReturnValue(jsonFlag);
      repo.save.mockResolvedValue(jsonFlag);
      await service.create({
        fallthrough: { variations: [{ variation: 1, weight: 100 }] },
        key: 'payload',
        kind: ROLLOUT_FLAG_KIND.JSON,
        variations: [{ value: { a: 1 } }, { value: [1, 2] }],
      });
    });
  });

  describe('update', () => {
    it('returns null when the flag is missing', async () => {
      repo.findOne.mockResolvedValue(null);

      expect(await service.update('missing', { enabled: true })).toBeNull();
    });

    it('merges and saves a patch', async () => {
      const existing = flag({ enabled: false, key: 'new-dashboard' });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (entity: RolloutFlag) => entity);

      await service.update('flag-1', { enabled: true, targetRoles: ['admin'] });

      expect(repo.merge).toHaveBeenCalledWith(existing, {
        enabled: true,
        targetRoles: ['admin'],
      });
      expect(repo.save).toHaveBeenCalledWith(existing);
    });

    it('rejects a rename to a key already in use', async () => {
      const existing = flag({ id: 'flag-1', key: 'old-key' });
      repo.findOne
        .mockResolvedValueOnce(existing) // findById
        .mockResolvedValueOnce(flag({ id: 'flag-2', key: 'taken' })); // assertKeyAvailable

      await expect(
        service.update('flag-1', { key: 'taken' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a patch that leaves fallthrough weights invalid', async () => {
      repo.findOne.mockResolvedValue(flag());

      await expect(
        service.update('flag-1', {
          fallthrough: {
            variations: [
              { variation: 0, weight: 10 },
              { variation: 1, weight: 10 },
            ],
          },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('returns true when a row was deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });
      expect(await service.remove('flag-1')).toBe(true);
    });

    it('returns false when nothing was deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });
      expect(await service.remove('flag-1')).toBe(false);
    });
  });

  describe('evaluate', () => {
    it('returns flag_not_found when the key is missing', async () => {
      repo.findOne.mockResolvedValue(null);

      expect(await service.evaluate('nope', userPrincipal)).toEqual({
        key: 'nope',
        kind: ROLLOUT_FLAG_KIND.BOOLEAN,
        reason: ROLLOUT_EVALUATION_REASON.FLAG_NOT_FOUND,
        value: false,
        variationIndex: -1,
      });
    });

    it('returns off variation when the flag is disabled', async () => {
      repo.findOne.mockResolvedValue(flag({ enabled: false }));

      expect(await service.evaluate('new-dashboard', userPrincipal)).toEqual({
        key: 'new-dashboard',
        kind: ROLLOUT_FLAG_KIND.BOOLEAN,
        reason: ROLLOUT_EVALUATION_REASON.OFF,
        value: false,
        variationIndex: 0,
      });
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });

    it('returns off variation when the actor fails targetRoles', async () => {
      repo.findOne.mockResolvedValue(flag({ targetRoles: ['admin'] }));
      rolesService.findRoleNamesByUserId.mockResolvedValue(['viewer']);

      expect(await service.evaluate('new-dashboard', userPrincipal)).toEqual({
        key: 'new-dashboard',
        kind: ROLLOUT_FLAG_KIND.BOOLEAN,
        reason: ROLLOUT_EVALUATION_REASON.TARGET_ROLES,
        value: false,
        variationIndex: 0,
      });
    });

    it('returns fallthrough variation for an eligible actor (100% true)', async () => {
      repo.findOne.mockResolvedValue(flag({ targetRoles: [] }));

      expect(await service.evaluate('new-dashboard', userPrincipal)).toEqual({
        key: 'new-dashboard',
        kind: ROLLOUT_FLAG_KIND.BOOLEAN,
        reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
        value: true,
        variationIndex: 1,
      });
    });

    describe('when fallthrough uses percentage weights', () => {
      const weighted = flag({
        fallthrough: {
          variations: [
            { variation: 0, weight: 50 },
            { variation: 1, weight: 50 },
          ],
        },
      });

      it('selects variation 0 for bucket 0', async () => {
        repo.findOne.mockResolvedValue(weighted);
        const principal: AuthPrincipal = {
          kind: AUTH_PRINCIPAL_KIND_USER,
          sub: bucket0Id,
        };

        expect(
          await service.evaluate('new-dashboard', principal),
        ).toMatchObject({
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: false,
          variationIndex: 0,
        });
      });

      it('selects variation 1 for bucket 99 (even/odd-style 50/50)', async () => {
        repo.findOne.mockResolvedValue(weighted);
        const principal: AuthPrincipal = {
          kind: AUTH_PRINCIPAL_KIND_USER,
          sub: bucket99Id,
        };

        expect(
          await service.evaluate('new-dashboard', principal),
        ).toMatchObject({
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: true,
          variationIndex: 1,
        });
      });

      it('honors 0/100 weights for every bucket', async () => {
        repo.findOne.mockResolvedValue(
          flag({
            fallthrough: {
              variations: [
                { variation: 0, weight: 0 },
                { variation: 1, weight: 100 },
              ],
            },
          }),
        );
        const results = await Promise.all(
          [bucket0Id, bucket99Id, userId].map((sub) =>
            service.evaluate('new-dashboard', {
              kind: AUTH_PRINCIPAL_KIND_USER,
              sub,
            }),
          ),
        );
        for (const result of results) {
          expect(result.variationIndex).toBe(1);
          expect(result.value).toBe(true);
        }
      });

      it('honors 100/0 weights for every bucket', async () => {
        repo.findOne.mockResolvedValue(
          flag({
            fallthrough: {
              variations: [
                { variation: 0, weight: 100 },
                { variation: 1, weight: 0 },
              ],
            },
          }),
        );
        const result = await service.evaluate('new-dashboard', {
          kind: AUTH_PRINCIPAL_KIND_USER,
          sub: bucket99Id,
        });
        expect(result.variationIndex).toBe(0);
        expect(result.value).toBe(false);
      });
    });

    describe('when evaluating each kind', () => {
      it('returns string variation values', async () => {
        repo.findOne.mockResolvedValue(
          flag({
            fallthrough: { variations: [{ variation: 1, weight: 100 }] },
            kind: ROLLOUT_FLAG_KIND.STRING,
            variations: [{ value: 'a' }, { value: 'b' }],
          }),
        );
        expect(await service.evaluate('new-dashboard', userPrincipal)).toEqual({
          key: 'new-dashboard',
          kind: ROLLOUT_FLAG_KIND.STRING,
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: 'b',
          variationIndex: 1,
        });
      });

      it('returns number variation values', async () => {
        repo.findOne.mockResolvedValue(
          flag({
            fallthrough: { variations: [{ variation: 1, weight: 100 }] },
            kind: ROLLOUT_FLAG_KIND.NUMBER,
            variations: [{ value: 1 }, { value: 42 }],
          }),
        );
        expect(await service.evaluate('new-dashboard', userPrincipal)).toEqual({
          key: 'new-dashboard',
          kind: ROLLOUT_FLAG_KIND.NUMBER,
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: 42,
          variationIndex: 1,
        });
      });

      it('returns json variation values', async () => {
        const payload = { enabled: true, nested: [1] };
        repo.findOne.mockResolvedValue(
          flag({
            fallthrough: { variations: [{ variation: 1, weight: 100 }] },
            kind: ROLLOUT_FLAG_KIND.JSON,
            variations: [{ value: {} }, { value: payload }],
          }),
        );
        expect(await service.evaluate('new-dashboard', userPrincipal)).toEqual({
          key: 'new-dashboard',
          kind: ROLLOUT_FLAG_KIND.JSON,
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: payload,
          variationIndex: 1,
        });
      });
    });
  });

  describe('isEnabled', () => {
    it('returns false for an unknown key', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.isEnabled('nope', userPrincipal)).toBe(false);
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });

    it('returns false when the flag is disabled', async () => {
      repo.findOne.mockResolvedValue(flag({ enabled: false }));
      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        false,
      );
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });

    it('returns the resolved boolean (true) when enabled with empty targetRoles', async () => {
      repo.findOne.mockResolvedValue(flag({ enabled: true, targetRoles: [] }));
      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        true,
      );
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });

    it('returns true when the actor holds a targeted role (user branch)', async () => {
      repo.findOne.mockResolvedValue(flag({ targetRoles: ['admin'] }));
      rolesService.findRoleNamesByUserId.mockResolvedValue(['admin', 'user']);

      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        true,
      );
      expect(rolesService.findRoleNamesByUserId).toHaveBeenCalledWith(userId);
    });

    it('returns false when the actor lacks every targeted role', async () => {
      repo.findOne.mockResolvedValue(flag({ targetRoles: ['admin'] }));
      rolesService.findRoleNamesByUserId.mockResolvedValue(['viewer']);

      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        false,
      );
    });

    it('resolves roles via the service-account branch', async () => {
      repo.findOne.mockResolvedValue(flag({ targetRoles: ['mcp'] }));
      rolesService.findRoleNamesByServiceAccountId.mockResolvedValue(['mcp']);

      expect(
        await service.isEnabled('new-dashboard', serviceAccountPrincipal),
      ).toBe(true);
      expect(rolesService.findRoleNamesByServiceAccountId).toHaveBeenCalledWith(
        serviceAccountId,
      );
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });

    it('returns false for non-boolean flags even when fallthrough wins', async () => {
      repo.findOne.mockResolvedValue(
        flag({
          fallthrough: { variations: [{ variation: 1, weight: 100 }] },
          kind: ROLLOUT_FLAG_KIND.STRING,
          variations: [{ value: 'a' }, { value: 'b' }],
        }),
      );
      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        false,
      );
    });

    it('returns false when fallthrough resolves the boolean false variation', async () => {
      repo.findOne.mockResolvedValue(
        flag({
          fallthrough: { variations: [{ variation: 0, weight: 100 }] },
        }),
      );
      expect(await service.isEnabled('new-dashboard', userPrincipal)).toBe(
        false,
      );
    });
  });

  describe('evaluateAll', () => {
    it('evaluates each flag and resolves roles at most once', async () => {
      repo.find.mockResolvedValue([
        flag({ id: '1', key: 'global-on', targetRoles: [] }),
        flag({ id: '2', key: 'admin-only', targetRoles: ['admin'] }),
        flag({ enabled: false, id: '3', key: 'off', targetRoles: ['admin'] }),
        flag({ id: '4', key: 'viewer-only', targetRoles: ['viewer'] }),
      ]);
      rolesService.findRoleNamesByUserId.mockResolvedValue(['admin']);

      const result = await service.evaluateAll(userPrincipal);

      expect(result).toEqual([
        {
          key: 'global-on',
          kind: ROLLOUT_FLAG_KIND.BOOLEAN,
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: true,
          variationIndex: 1,
        },
        {
          key: 'admin-only',
          kind: ROLLOUT_FLAG_KIND.BOOLEAN,
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: true,
          variationIndex: 1,
        },
        {
          key: 'off',
          kind: ROLLOUT_FLAG_KIND.BOOLEAN,
          reason: ROLLOUT_EVALUATION_REASON.OFF,
          value: false,
          variationIndex: 0,
        },
        {
          key: 'viewer-only',
          kind: ROLLOUT_FLAG_KIND.BOOLEAN,
          reason: ROLLOUT_EVALUATION_REASON.TARGET_ROLES,
          value: false,
          variationIndex: 0,
        },
      ]);
      expect(rolesService.findRoleNamesByUserId).toHaveBeenCalledTimes(1);
    });

    it('skips role resolution when no enabled flag targets roles', async () => {
      repo.find.mockResolvedValue([
        flag({ id: '1', key: 'global-on', targetRoles: [] }),
        flag({ enabled: false, id: '2', key: 'off', targetRoles: ['admin'] }),
      ]);

      const result = await service.evaluateAll(userPrincipal);

      expect(result).toEqual([
        {
          key: 'global-on',
          kind: ROLLOUT_FLAG_KIND.BOOLEAN,
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          value: true,
          variationIndex: 1,
        },
        {
          key: 'off',
          kind: ROLLOUT_FLAG_KIND.BOOLEAN,
          reason: ROLLOUT_EVALUATION_REASON.OFF,
          value: false,
          variationIndex: 0,
        },
      ]);
      expect(rolesService.findRoleNamesByUserId).not.toHaveBeenCalled();
    });
  });
});
