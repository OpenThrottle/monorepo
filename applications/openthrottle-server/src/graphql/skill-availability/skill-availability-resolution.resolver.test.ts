import type {
  Project,
  ProjectSkillView,
  UserSkillTag,
} from '@openthrottle/nestjs-repositories';
import {
  ProjectSkillsService,
  ProjectsService,
  SkillAvailabilityService,
  SkillTagsService,
} from '@openthrottle/nestjs-repositories';
import type { SkillAvailabilityRuleSet } from '@openthrottle/openthrottle-skills';
import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanContextAvailabilityService } from '../../services/plan-context-availability/plan-context-availability.service';
import { SkillAvailabilityResolutionResolver } from './skill-availability-resolution.resolver';

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
      slug: 'agents-ralph',
      source: 'openthrottle',
      sourceUrl: undefined,
      staticDisableModelInvocation: false,
      tags: [],
    },
    {
      description: undefined,
      slug: 'git-commit',
      source: 'external',
      sourceUrl: undefined,
      staticDisableModelInvocation: undefined,
      tags: [],
    },
    {
      description: undefined,
      slug: 'github-deep-review',
      source: 'external',
      sourceUrl: undefined,
      staticDisableModelInvocation: true,
      tags: ['github'],
    },
  ];

  const makeTag = (tag: string): UserSkillTag => ({
    createdAt: new Date('2026-07-11T12:00:00.000Z'),
    dimension: 'domain',
    id: `id-${tag}`,
    tag,
    updatedAt: new Date('2026-07-11T12:00:00.000Z'),
    userId,
  });

  const mockProjectSkillsService = createMock<ProjectSkillsService>({
    getSkillsForProject: vi.fn(),
  });
  const mockProjectsService = createMock<ProjectsService>({
    findByNxProjectName: vi.fn(),
  });
  const mockSkillAvailabilityService = createMock<SkillAvailabilityService>({
    getRuleSetForProject: vi.fn(),
  });
  const mockSkillTagsService = createMock<SkillTagsService>({
    listForUser: vi.fn(),
  });

  let resolver: SkillAvailabilityResolutionResolver;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = await Test.createTestingModule({
      providers: [
        SkillAvailabilityResolutionResolver,
        {
          provide: PlanContextAvailabilityService,
          useValue: createMock<PlanContextAvailabilityService>(),
        },
        { provide: ProjectSkillsService, useValue: mockProjectSkillsService },
        { provide: ProjectsService, useValue: mockProjectsService },
        {
          provide: SkillAvailabilityService,
          useValue: mockSkillAvailabilityService,
        },
        { provide: SkillTagsService, useValue: mockSkillTagsService },
      ],
    }).compile();

    resolver = app.get(SkillAvailabilityResolutionResolver);

    vi.mocked(mockProjectSkillsService.getSkillsForProject).mockResolvedValue(
      views,
    );
    vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue([
      makeTag('github'),
    ]);
  });

  test('no-config passthrough: effective === static ?? false with frontmatter provenance', async () => {
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue(undefined);

    const result = await resolver.skillAvailability(userId, projectId);

    expect(mockProjectsService.findByNxProjectName).not.toHaveBeenCalled();
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

    const result = await resolver.skillAvailability(userId, projectId);

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
      projectId,
      'interactive',
    );
    const ralph = await resolver.skillAvailability(userId, projectId, 'ralph');

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
      resolver.skillAvailability(userId, projectId, 'production'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockProjectSkillsService.getSkillsForProject).not.toHaveBeenCalled();
  });

  test('resolves the dogfood monorepo project when projectId is omitted', async () => {
    vi.mocked(mockProjectsService.findByNxProjectName).mockResolvedValue(
      dogfoodProject,
    );
    vi.mocked(
      mockSkillAvailabilityService.getRuleSetForProject,
    ).mockResolvedValue(undefined);

    const result = await resolver.skillAvailability(userId);

    expect(mockProjectsService.findByNxProjectName).toHaveBeenCalledWith(
      'OpenThrottle/monorepo',
    );
    expect(mockProjectSkillsService.getSkillsForProject).toHaveBeenCalledWith(
      'monorepo-project-id',
    );
    expect(result.totalCount).toBe(3);
  });

  test('returns an empty result when the dogfood project is absent', async () => {
    vi.mocked(mockProjectsService.findByNxProjectName).mockResolvedValue(null);

    const result = await resolver.skillAvailability(userId);

    expect(result).toEqual({ skills: [], totalCount: 0, warnings: [] });
    expect(mockProjectSkillsService.getSkillsForProject).not.toHaveBeenCalled();
  });

  test('surfaces a warning for a skill tag outside the vocabulary', async () => {
    vi.mocked(mockProjectSkillsService.getSkillsForProject).mockResolvedValue([
      {
        description: undefined,
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

    const result = await resolver.skillAvailability(userId, projectId);

    expect(result.warnings).toEqual([
      'unknown-tag:not-a-real-tag@mystery-skill',
    ]);
  });
});
