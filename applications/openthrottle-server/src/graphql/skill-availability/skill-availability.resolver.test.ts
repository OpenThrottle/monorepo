import type {
  SkillAvailabilityRule,
  UserSkillTag,
} from '@openthrottle/nestjs-repositories';
import {
  SkillAvailabilityService,
  SkillTagsService,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { SkillAvailabilityResolver } from './skill-availability.resolver';

describe('SkillAvailabilityResolver', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const projectId = '22222222-2222-4222-8222-222222222222';

  const makeTag = (tag: string): UserSkillTag => ({
    createdAt: new Date('2026-07-11T12:00:00.000Z'),
    id: `id-${tag}`,
    tag,
    updatedAt: new Date('2026-07-11T12:00:00.000Z'),
    userId,
  });

  const mockSkillAvailabilityService = createMock<SkillAvailabilityService>({
    addRule: vi.fn(),
    deleteRuleSet: vi.fn(),
    getRuleSetForProject: vi.fn(),
    removeRule: vi.fn(),
    updateRule: vi.fn(),
    upsertRuleSet: vi.fn(),
  });
  const mockSkillTagsService = createMock<SkillTagsService>({
    listForUser: vi.fn(),
  });

  let resolver: SkillAvailabilityResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SkillAvailabilityResolver,
        {
          provide: SkillAvailabilityService,
          useValue: mockSkillAvailabilityService,
        },
        { provide: SkillTagsService, useValue: mockSkillTagsService },
      ],
    })
      .overrideGuard(GqlPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = app.get(SkillAvailabilityResolver);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('skillAvailabilityRuleSet returns null for a project with no rules', async () => {
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue(undefined);

    await expect(
      resolver.skillAvailabilityRuleSet(projectId),
    ).resolves.toBeNull();
  });

  test('skillAvailabilityRuleSet maps the rule set onto the object shape', async () => {
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue({
      posture: 'deny',
      rules: [
        {
          environment: 'ralph',
          id: 'rule-1',
          slugAllow: ['git-commit'],
          slugDeny: [],
          tagAllow: [],
          tagDeny: ['github'],
        },
      ],
    });

    const result = await resolver.skillAvailabilityRuleSet(projectId);

    expect(result).toEqual({
      posture: 'deny',
      rules: [
        {
          environment: 'ralph',
          id: 'rule-1',
          slugAllow: ['git-commit'],
          slugDeny: [],
          tagAllow: [],
          tagDeny: ['github'],
        },
      ],
    });
  });

  test('upsertSkillAvailabilityRuleSet delegates and returns the refreshed rule set', async () => {
    vi.mocked(mockSkillAvailabilityService.upsertRuleSet).mockResolvedValue(
      createMock(),
    );
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue({ posture: 'allow', rules: [] });

    const result = await resolver.upsertSkillAvailabilityRuleSet(
      projectId,
      'allow',
    );

    expect(mockSkillAvailabilityService.upsertRuleSet).toHaveBeenCalledWith(
      projectId,
      { posture: 'allow' },
    );
    expect(result).toEqual({ posture: 'allow', rules: [] });
  });

  test('deleteSkillAvailabilityRuleSet returns the service boolean', async () => {
    vi.mocked(mockSkillAvailabilityService.deleteRuleSet).mockResolvedValue(
      true,
    );

    await expect(
      resolver.deleteSkillAvailabilityRuleSet(projectId),
    ).resolves.toBe(true);
  });

  test('addSkillAvailabilityRule passes the caller vocabulary as knownTags', async () => {
    vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue([
      makeTag('github'),
      makeTag('infra'),
    ]);
    const rule: SkillAvailabilityRule = createMock<SkillAvailabilityRule>({
      environment: null,
      id: 'rule-1',
      slugAllow: [],
      slugDeny: [],
      tagAllow: ['github'],
      tagDeny: [],
    });
    vi.mocked(mockSkillAvailabilityService.addRule).mockResolvedValue(rule);

    const result = await resolver.addSkillAvailabilityRule(userId, projectId, {
      slugAllow: [],
      slugDeny: [],
      tagAllow: ['github'],
      tagDeny: [],
    });

    expect(mockSkillAvailabilityService.addRule).toHaveBeenCalledWith(
      projectId,
      expect.objectContaining({ tagAllow: ['github'] }),
      ['github', 'infra'],
    );
    expect(result).toMatchObject({ id: 'rule-1', tagAllow: ['github'] });
  });

  test('updateSkillAvailabilityRule passes knownTags and delegates by ruleId', async () => {
    vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue([
      makeTag('infra'),
    ]);
    const rule: SkillAvailabilityRule = createMock<SkillAvailabilityRule>({
      environment: 'interactive',
      id: 'rule-9',
      slugAllow: [],
      slugDeny: [],
      tagAllow: [],
      tagDeny: ['infra'],
    });
    vi.mocked(mockSkillAvailabilityService.updateRule).mockResolvedValue(rule);

    const result = await resolver.updateSkillAvailabilityRule(
      userId,
      'rule-9',
      { slugAllow: [], slugDeny: [], tagAllow: [], tagDeny: ['infra'] },
    );

    expect(mockSkillAvailabilityService.updateRule).toHaveBeenCalledWith(
      'rule-9',
      expect.objectContaining({ tagDeny: ['infra'] }),
      ['infra'],
    );
    expect(result).toMatchObject({ id: 'rule-9', tagDeny: ['infra'] });
  });

  test('removeSkillAvailabilityRule returns the service boolean', async () => {
    vi.mocked(mockSkillAvailabilityService.removeRule).mockResolvedValue(false);

    await expect(resolver.removeSkillAvailabilityRule('missing')).resolves.toBe(
      false,
    );
  });
});
