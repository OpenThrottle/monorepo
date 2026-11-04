import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { PERMISSIONS, PERMISSIONS_KEY } from '@openthrottle/nestjs-rbac';
import {
  AgentTokenUsageService,
  CAPTURE_HEALTH_STREAMS,
  RolesService,
  SkillUsageEventsService,
} from '@openthrottle/nestjs-repositories';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { CaptureHealthResolver } from './capture-health.resolver.ts';

describe('CaptureHealthResolver', () => {
  let resolver: CaptureHealthResolver;

  const listSkillCaptureHealth = vi.fn();
  const listTokenCaptureHealth = vi.fn();

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        CaptureHealthResolver,
        {
          provide: SkillUsageEventsService,
          useValue: createMock<SkillUsageEventsService>({
            listCaptureHealth: listSkillCaptureHealth,
          }),
        },
        {
          provide: AgentTokenUsageService,
          useValue: createMock<AgentTokenUsageService>({
            listCaptureHealth: listTokenCaptureHealth,
          }),
        },
        { provide: RolesService, useValue: createMock<RolesService>() },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get<CaptureHealthResolver>(CaptureHealthResolver);
  });

  beforeEach(() => {
    listSkillCaptureHealth.mockReset();
    listTokenCaptureHealth.mockReset();
  });

  describe('captureHealth', () => {
    test('concatenates skill and token rows into GraphQL objects', async () => {
      const skillAt = new Date('2026-10-29T10:00:00.000Z');
      const tokenAt = new Date('2026-10-20T10:00:00.000Z');
      listSkillCaptureHealth.mockResolvedValue([
        {
          lastCapturedAt: skillAt,
          source: 'claude-code',
          stream: CAPTURE_HEALTH_STREAMS.SKILL_EVENTS,
        },
      ]);
      listTokenCaptureHealth.mockResolvedValue([
        {
          lastCapturedAt: tokenAt,
          source: 'claude',
          stream: CAPTURE_HEALTH_STREAMS.TOKEN_USAGE,
        },
      ]);

      const result = await resolver.captureHealth();

      expect(result).toEqual([
        {
          lastCapturedAt: skillAt,
          source: 'claude-code',
          stream: 'skill_events',
        },
        { lastCapturedAt: tokenAt, source: 'claude', stream: 'token_usage' },
      ]);
    });

    describe('when nothing has been captured', () => {
      test('returns an empty list', async () => {
        listSkillCaptureHealth.mockResolvedValue([]);
        listTokenCaptureHealth.mockResolvedValue([]);

        await expect(resolver.captureHealth()).resolves.toEqual([]);
      });
    });

    describe('when a service fails', () => {
      test('propagates the error rather than reporting partial health', async () => {
        listSkillCaptureHealth.mockResolvedValue([]);
        listTokenCaptureHealth.mockRejectedValue(new Error('db down'));

        await expect(resolver.captureHealth()).rejects.toThrow('db down');
      });
    });

    test('requires SETTINGS_READ', () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        CaptureHealthResolver.prototype.captureHealth,
      );

      expect(permissions).toEqual([PERMISSIONS.SETTINGS_READ]);
    });
  });
});
