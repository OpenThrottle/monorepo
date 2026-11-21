import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Project } from '@openthrottle/nestjs-repositories-server';
import {
  ProjectsRepository,
  SkillTagsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createProjectsRepositoryMock,
  createSkillTagsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import type { SkillAvailabilityRuleSet } from '@openthrottle/openthrottle-skills';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PlanContextAvailabilityService } from '../../../services/plan-context-availability/plan-context-availability.service.ts';
import { ProjectSkillsService } from '../../../services/project-skills/project-skills.service.ts';
import type { ProjectSkillView } from '../../../services/project-skills/project-skills.types.ts';
import { SkillAvailabilityService } from '../../../services/skill-availability/skill-availability.service.ts';
import { SkillAvailabilityResolutionResolver } from './skill-availability-resolution.resolver.ts';

describe('SkillAvailabilityResolutionResolver', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const projectId = '22222222-2222-4222-8222-222222222222';

  const dogfoodProject = createMock<Project>({
    id: 'monorepo-project-id',
    nxProjectName: 'OpenThrottle/monorepo',
  });

  const views: ProjectSkillView[] = [
    {
      description: undefined,
      orphanedAt: undefined,
      slug: 'agents-ralph',
      source: 'openthrottle',
      sourceUrl: undefined,
      staticDisableModelInvocation: false,
      tags: [],
    },
    {
      description: undefined,
      orphanedAt: undefined,
      slug: 'git-commit',
      source: 'external',
      sourceUrl: undefined,
      staticDisableModelInvocation: undefined,
      tags: [],
    },
    {
      description: undefined,
      orphanedAt: undefined,
      slug: 'github-deep-review',
      source: 'external',
      sourceUrl: undefined,
      staticDisableModelInvocation: true,
      tags: ['github'],
    },
  ];

  const mockProjectSkillsService = createMock<ProjectSkillsService>({
    getSkillsForProject: vi.fn(),
  });
  const mockProjectsRepository = createProjectsRepositoryMock();
  const mockSkillAvailabilityService = createMock<SkillAvailabilityService>({
    getRuleSetForProject: vi.fn(),
  });
  const mockSkillTagsRepository = createSkillTagsRepositoryMock();
  const mockPlanContextAvailabilityService =
    createMock<PlanContextAvailabilityService>({ resolveForPlan: vi.fn() });

  let resolver: SkillAvailabilityResolutionResolver;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = await Test.createTestingModule({
      providers: [
        SkillAvailabilityResolutionResolver,
        {
          provide: PlanContextAvailabilityService,
          useValue: mockPlanContextAvailabilityService,
        },
        { provide: ProjectSkillsService, useValue: mockProjectSkillsService },
        { provide: ProjectsRepository, useValue: mockProjectsRepository },
        {
          provide: SkillAvailabilityService,
          useValue: mockSkillAvailabilityService,
        },
        { provide: SkillTagsRepository, useValue: mockSkillTagsRepository },
      ],
    }).compile();

    resolver = app.get(SkillAvailabilityResolutionResolver);

    vi.mocked(mockProjectSkillsService.getSkillsForProject).mockResolvedValue(
      views,
    );
    mockSkillTagsRepository.listVocabularyTags.mockResolvedValue(['github']);
  });

  test('no-config passthrough: effective === static ?? false with frontmatter provenance', async () => {
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue(undefined);

    const result = await resolver.skillAvailability(userId, 'user', projectId);

    expect(mockProjectsRepository.findByNxProjectName).not.toHaveBeenCalled();
    expect(result.totalCount).toBe(3);
    expect(result.warnings).toEqual([]);
    expect(result.skills).toEqual([
      {
        effectiveDisableModelInvocation: false,
        matchedPlanTags: [],
        planRelevant: false,
        provenance: 'frontmatter:false',
        slug: 'agents-ralph',
        staticDisableModelInvocation: false,
      },
      {
        effectiveDisableModelInvocation: false,
        matchedPlanTags: [],
        planRelevant: false,
        provenance: 'frontmatter:unset',
        slug: 'git-commit',
        staticDisableModelInvocation: null,
      },
      {
        effectiveDisableModelInvocation: true,
        matchedPlanTags: [],
        planRelevant: false,
        provenance: 'frontmatter:true',
        slug: 'github-deep-review',
        staticDisableModelInvocation: true,
      },
    ]);
    for (const skill of result.skills) {
      const staticValue = skill.staticDisableModelInvocation ?? false;
      expect(skill.effectiveDisableModelInvocation).toBe(staticValue);
    }
  });

  test('rule-driven flip surfaces provenance with the ruleId', async () => {
    const ruleSet: SkillAvailabilityRuleSet = {
      posture: 'allow',
      rules: [
        {
          environment: null,
          id: 'rule-1',
          slugAllow: [],
          slugDeny: [],
          tagAllow: [],
          tagDeny: ['github'],
        },
      ],
    };
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue(ruleSet);

    const result = await resolver.skillAvailability(userId, 'user', projectId);

    const flipped = result.skills.find(
      (skill) => skill.slug === 'github-deep-review',
    );
    expect(flipped).toMatchObject({
      effectiveDisableModelInvocation: true,
      provenance: 'tag-deny:github@rule-1',
    });
  });

  test('environment-qualified rule changes the outcome per context', async () => {
    const ruleSet: SkillAvailabilityRuleSet = {
      posture: 'allow',
      rules: [
        {
          environment: 'ralph',
          id: 'rule-ralph',
          slugAllow: ['github-deep-review'],
          slugDeny: [],
          tagAllow: [],
          tagDeny: [],
        },
      ],
    };
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue(ruleSet);

    const interactive = await resolver.skillAvailability(
      userId,
      'user',
      projectId,
      'interactive',
    );
    const ralph = await resolver.skillAvailability(
      userId,
      'user',
      projectId,
      'ralph',
    );

    // interactive: the ralph-scoped rule does not apply → frontmatter true stays.
    expect(
      interactive.skills.find((s) => s.slug === 'github-deep-review'),
    ).toMatchObject({
      effectiveDisableModelInvocation: true,
      provenance: 'frontmatter:true',
    });
    // ralph: the slug-allow rule re-enables the skill.
    expect(
      ralph.skills.find((s) => s.slug === 'github-deep-review'),
    ).toMatchObject({
      effectiveDisableModelInvocation: false,
      provenance: 'slug-allow:github-deep-review@rule-ralph',
    });
  });

  test('rejects an unknown environment with an actionable error', async () => {
    await expect(
      resolver.skillAvailability(userId, 'user', projectId, 'production'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockProjectSkillsService.getSkillsForProject).not.toHaveBeenCalled();
  });

  test('resolves the dogfood monorepo project when projectId is omitted', async () => {
    mockProjectsRepository.findByNxProjectName.mockResolvedValue(
      dogfoodProject,
    );
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue(undefined);

    const result = await resolver.skillAvailability(userId, 'user');

    expect(mockProjectsRepository.findByNxProjectName).toHaveBeenCalledWith(
      'OpenThrottle/monorepo',
    );
    expect(mockProjectSkillsService.getSkillsForProject).toHaveBeenCalledWith(
      'monorepo-project-id',
    );
    expect(result.totalCount).toBe(3);
  });

  test('returns an empty result when the dogfood project is absent', async () => {
    mockProjectsRepository.findByNxProjectName.mockResolvedValue(null);

    const result = await resolver.skillAvailability(userId, 'user');

    expect(result).toEqual({
      attachedPrompts: [],
      skills: [],
      totalCount: 0,
      warnings: [],
    });
    expect(mockProjectSkillsService.getSkillsForProject).not.toHaveBeenCalled();
  });

  test('surfaces a warning for a skill tag outside the vocabulary', async () => {
    vi.mocked(mockProjectSkillsService.getSkillsForProject).mockResolvedValue([
      {
        description: undefined,
        orphanedAt: undefined,
        slug: 'mystery-skill',
        source: 'external',
        sourceUrl: undefined,
        staticDisableModelInvocation: false,
        tags: ['not-a-real-tag'],
      },
    ]);
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue({ posture: 'allow', rules: [] });

    const result = await resolver.skillAvailability(userId, 'user', projectId);

    expect(result.warnings).toEqual([
      'unknown-tag:not-a-real-tag@mystery-skill',
    ]);
  });

  test('still resolves a DB-only orphan skill with no matching SKILL.md', async () => {
    vi.mocked(mockProjectSkillsService.getSkillsForProject).mockResolvedValue([
      {
        description: undefined,
        orphanedAt: new Date('2026-08-14T00:00:00.000Z'),
        slug: 'deleted-from-disk',
        source: 'external',
        sourceUrl: undefined,
        staticDisableModelInvocation: undefined,
        tags: [],
      },
    ]);
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue({ posture: 'allow', rules: [] });

    const result = await resolver.skillAvailability(userId, 'user', projectId);

    expect(result.totalCount).toBe(1);
    expect(result.skills[0]?.slug).toBe('deleted-from-disk');
    expect(result.warnings).toEqual([]);
  });

  describe('when the caller is a service account', () => {
    const serviceAccountId = '33333333-3333-4333-8333-333333333333';

    test('reads the vocabulary without seeding user rows', async () => {
      vi.mocked(
        mockSkillAvailabilityService.getRuleSetForProject,
      ).mockResolvedValue(undefined);

      const result = await resolver.skillAvailability(
        serviceAccountId,
        'service_account',
        projectId,
      );

      expect(result.totalCount).toBe(3);
      expect(mockSkillTagsRepository.listVocabularyTags).toHaveBeenCalledWith(
        serviceAccountId,
        { seedDefaults: false },
      );
      expect(mockSkillTagsRepository.listForUser).not.toHaveBeenCalled();
    });

    test('tells the plan-context path not to seed either', async () => {
      vi.mocked(
        mockPlanContextAvailabilityService.resolveForPlan,
      ).mockResolvedValue({
        attachedPrompts: [],
        effectiveDomainTags: [],
        skills: [],
        warnings: [],
      });
      const planId = '44444444-4444-4444-8444-444444444444';

      await resolver.skillAvailability(
        serviceAccountId,
        'service_account',
        undefined,
        undefined,
        planId,
      );

      expect(
        mockPlanContextAvailabilityService.resolveForPlan,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          planId,
          vocabularySeedDefaults: false,
          vocabularyUserId: serviceAccountId,
        }),
      );
    });
  });

  test('passes the plan context attached prompts through in order', async () => {
    const attachedPrompts = [
      {
        content: 'persona body',
        filePath: null,
        placement: 'start' as const,
        promptId: 'prompt-1',
        promptType: 'personas' as const,
        ruleId: 'rule-1',
        title: 'Reviewer',
      },
    ];
    vi.mocked(
      mockPlanContextAvailabilityService.resolveForPlan,
    ).mockResolvedValue({
      attachedPrompts,
      effectiveDomainTags: [],
      skills: [],
      warnings: [],
    });

    const result = await resolver.skillAvailability(
      userId,
      'user',
      undefined,
      undefined,
      '44444444-4444-4444-8444-444444444444',
    );

    expect(result.attachedPrompts).toEqual(attachedPrompts);
  });

  describe('when the caller is a user', () => {
    test('reads the vocabulary with first-read seeding', async () => {
      vi.mocked(
        mockSkillAvailabilityService.getRuleSetForProject,
      ).mockResolvedValue(undefined);

      await resolver.skillAvailability(userId, 'user', projectId);

      expect(mockSkillTagsRepository.listVocabularyTags).toHaveBeenCalledWith(
        userId,
        { seedDefaults: true },
      );
    });
  });
});
