/**
 * @description Unit tests for RolloutResolver: service delegation plus the
 * @Permissions gating metadata (FLAGS_READ for reads/myFeatureFlags, FLAGS_WRITE
 * for mutations) that GqlPermissionsGuard enforces (admin has both; viewer has
 * only flags:read, so mutations are denied to it).
 */

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
    test('rolloutFlags lists all flags', async () => {
      const result = await resolver.rolloutFlags();
      expect(result).toHaveLength(1);
      expect(rolloutService.findAll).toHaveBeenCalled();
    });

    test('rolloutFlag fetches by id', async () => {
      const result = await resolver.rolloutFlag('flag-1');
      expect(result?.id).toBe('flag-1');
      expect(rolloutService.findById).toHaveBeenCalledWith('flag-1');
    });

    test('myFeatureFlags evaluates for the actor', async () => {
      const result = await resolver.myFeatureFlags(userPrincipal);
      expect(result).toEqual([{ enabled: true, key: 'new-dashboard' }]);
      expect(rolloutService.evaluateAll).toHaveBeenCalledWith(userPrincipal);
    });

    test('createRolloutFlag delegates the mapped input', async () => {
      await resolver.createRolloutFlag({
        description: null,
        enabled: true,
        key: 'new-dashboard',
        targetRoles: ['admin'],
      });
      expect(rolloutService.create).toHaveBeenCalledWith({
        description: null,
        enabled: true,
        key: 'new-dashboard',
        targetRoles: ['admin'],
      });
    });

    test('updateRolloutFlag forwards only provided fields', async () => {
      await resolver.updateRolloutFlag({
        description: null,
        enabled: null,
        id: 'flag-1',
        key: null,
        targetRoles: ['viewer'],
      });
      expect(rolloutService.update).toHaveBeenCalledWith('flag-1', {
        description: null,
        targetRoles: ['viewer'],
      });
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
