/**
 * @description Unit tests for RolloutResolver: service delegation, typed
 * create/update mapping, evaluated response shape, and @Permissions gating
 * (FLAGS_READ for reads/myFeatureFlags, FLAGS_WRITE for mutations).
 */

import { BadRequestException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import {
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import { PERMISSIONS, PERMISSIONS_KEY } from '@openthrottle/nestjs-rbac';
import { RolesService } from '@openthrottle/nestjs-repositories';
import {
  ROLLOUT_BOOLEAN_DEFAULT_FALLTHROUGH,
  ROLLOUT_BOOLEAN_DEFAULT_VARIATIONS,
  ROLLOUT_EVALUATION_REASON,
  ROLLOUT_FLAG_KIND,
  RolloutService,
} from '@openthrottle/nestjs-rollout';
import type { RolloutFlag } from '@openthrottle/nestjs-rollout';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { RolloutResolver } from './rollout.resolver';

const flag: RolloutFlag = {
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
};

const stringFlag: RolloutFlag = {
  ...flag,
  fallthrough: {
    variations: [
      { variation: 0, weight: 90 },
      { variation: 1, weight: 10 },
    ],
  },
  id: 'flag-2',
  key: 'theme',
  kind: ROLLOUT_FLAG_KIND.STRING,
  variations: [{ value: 'light' }, { value: 'dark' }],
};

const userPrincipal: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: 'user-1',
};

const permissionsFor = (method: keyof RolloutResolver): unknown =>
  Reflect.getMetadata(PERMISSIONS_KEY, RolloutResolver.prototype[method]);

describe('RolloutResolver', () => {
  let resolver: RolloutResolver;
  let rolloutService: RolloutService;

  const mockRolloutService = createMock<RolloutService>({
    create: vi.fn().mockResolvedValue(flag),
    evaluateAll: vi.fn().mockResolvedValue([
      {
        key: 'new-dashboard',
        kind: ROLLOUT_FLAG_KIND.BOOLEAN,
        reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
        value: true,
        variationIndex: 1,
      },
      {
        key: 'theme',
        kind: ROLLOUT_FLAG_KIND.STRING,
        reason: ROLLOUT_EVALUATION_REASON.TARGET_ROLES,
        value: 'light',
        variationIndex: 0,
      },
    ]),
    findAll: vi.fn().mockResolvedValue([flag]),
    findById: vi.fn().mockResolvedValue(flag),
    remove: vi.fn().mockResolvedValue(true),
    update: vi.fn().mockResolvedValue(flag),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        RolloutResolver,
        GqlPermissionsGuard,
        { provide: RolloutService, useValue: mockRolloutService },
        { provide: RolesService, useValue: createMock<RolesService>() },
      ],
    }).compile();

    resolver = app.get<RolloutResolver>(RolloutResolver);
    rolloutService = app.get<RolloutService>(RolloutService);
  });

  describe('delegation', () => {
    test('rolloutFlags lists mapped flags', async () => {
      const result = await resolver.rolloutFlags();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'flag-1',
        kind: ROLLOUT_FLAG_KIND.BOOLEAN,
        variations: [{ valueJson: 'false' }, { valueJson: 'true' }],
      });
      expect(rolloutService.findAll).toHaveBeenCalled();
    });

    test('rolloutFlag fetches and maps by id', async () => {
      const result = await resolver.rolloutFlag('flag-1');
      expect(result?.id).toBe('flag-1');
      expect(result?.fallthrough).toEqual({
        variations: [{ variation: 1, weight: 100 }],
      });
      expect(rolloutService.findById).toHaveBeenCalledWith('flag-1');
    });

    test('myFeatureFlags returns typed evaluation shape', async () => {
      const result = await resolver.myFeatureFlags(userPrincipal);
      expect(result).toEqual([
        {
          enabled: true,
          key: 'new-dashboard',
          kind: ROLLOUT_FLAG_KIND.BOOLEAN,
          reason: ROLLOUT_EVALUATION_REASON.FALLTHROUGH,
          valueJson: 'true',
          variationIndex: 1,
        },
        {
          enabled: false,
          key: 'theme',
          kind: ROLLOUT_FLAG_KIND.STRING,
          reason: ROLLOUT_EVALUATION_REASON.TARGET_ROLES,
          valueJson: '"light"',
          variationIndex: 0,
        },
      ]);
      expect(rolloutService.evaluateAll).toHaveBeenCalledWith(userPrincipal);
    });

    test('createRolloutFlag maps typed boolean defaults through', async () => {
      await resolver.createRolloutFlag({
        description: null,
        enabled: true,
        fallthrough: null,
        key: 'new-dashboard',
        kind: null,
        offVariation: null,
        targetRoles: ['admin'],
        variations: null,
      });
      expect(rolloutService.create).toHaveBeenCalledWith({
        description: null,
        enabled: true,
        key: 'new-dashboard',
        targetRoles: ['admin'],
      });
    });

    test('createRolloutFlag maps string kind + allocations', async () => {
      vi.mocked(rolloutService.create).mockResolvedValueOnce(stringFlag);
      const result = await resolver.createRolloutFlag({
        description: null,
        enabled: true,
        fallthrough: {
          variations: [
            { variation: 0, weight: 90 },
            { variation: 1, weight: 10 },
          ],
        },
        key: 'theme',
        kind: ROLLOUT_FLAG_KIND.STRING,
        offVariation: 0,
        targetRoles: [],
        variations: [
          { description: null, name: null, valueJson: '"light"' },
          { description: null, name: null, valueJson: '"dark"' },
        ],
      });
      expect(rolloutService.create).toHaveBeenCalledWith({
        description: null,
        enabled: true,
        fallthrough: {
          variations: [
            { variation: 0, weight: 90 },
            { variation: 1, weight: 10 },
          ],
        },
        key: 'theme',
        kind: ROLLOUT_FLAG_KIND.STRING,
        offVariation: 0,
        targetRoles: [],
        variations: [{ value: 'light' }, { value: 'dark' }],
      });
      expect(result.kind).toBe(ROLLOUT_FLAG_KIND.STRING);
      expect(result.variations.map((v) => v.valueJson)).toEqual([
        '"light"',
        '"dark"',
      ]);
    });

    test('createRolloutFlag propagates domain validation errors', async () => {
      vi.mocked(rolloutService.create).mockRejectedValueOnce(
        new BadRequestException('fallthrough weights must sum to 100'),
      );
      await expect(
        resolver.createRolloutFlag({
          description: null,
          enabled: true,
          fallthrough: {
            variations: [{ variation: 0, weight: 50 }],
          },
          key: 'bad-weights',
          kind: ROLLOUT_FLAG_KIND.BOOLEAN,
          offVariation: 0,
          targetRoles: [],
          variations: [
            { description: null, name: null, valueJson: 'false' },
            { description: null, name: null, valueJson: 'true' },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('updateRolloutFlag forwards only provided typed fields', async () => {
      await resolver.updateRolloutFlag({
        description: null,
        enabled: null,
        fallthrough: {
          variations: [{ variation: 1, weight: 100 }],
        },
        id: 'flag-1',
        key: null,
        kind: null,
        offVariation: 0,
        targetRoles: ['viewer'],
        variations: null,
      });
      expect(rolloutService.update).toHaveBeenCalledWith('flag-1', {
        description: null,
        fallthrough: {
          variations: [{ variation: 1, weight: 100 }],
        },
        offVariation: 0,
        targetRoles: ['viewer'],
      });
    });

    test('updateRolloutFlag propagates invalid config from service', async () => {
      vi.mocked(rolloutService.update).mockRejectedValueOnce(
        new BadRequestException('offVariation out of range'),
      );
      await expect(
        resolver.updateRolloutFlag({
          description: null,
          enabled: null,
          fallthrough: null,
          id: 'flag-1',
          key: null,
          kind: null,
          offVariation: 99,
          targetRoles: null,
          variations: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
    test('deleteRolloutFlag removes by id', async () => {
      const result = await resolver.deleteRolloutFlag('flag-1');
      expect(result).toBe(true);
      expect(rolloutService.remove).toHaveBeenCalledWith('flag-1');
    });
  });

  describe('permission gating metadata', () => {
    test('reads and myFeatureFlags require flags:read', () => {
      expect(permissionsFor('rolloutFlags')).toEqual([PERMISSIONS.FLAGS_READ]);
      expect(permissionsFor('rolloutFlag')).toEqual([PERMISSIONS.FLAGS_READ]);
      expect(permissionsFor('myFeatureFlags')).toEqual([
        PERMISSIONS.FLAGS_READ,
      ]);
    });

    test('mutations require flags:write (denied to viewer)', () => {
      expect(permissionsFor('createRolloutFlag')).toEqual([
        PERMISSIONS.FLAGS_WRITE,
      ]);
      expect(permissionsFor('updateRolloutFlag')).toEqual([
        PERMISSIONS.FLAGS_WRITE,
      ]);
      expect(permissionsFor('deleteRolloutFlag')).toEqual([
        PERMISSIONS.FLAGS_WRITE,
      ]);
    });
  });
});
