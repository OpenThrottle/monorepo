import type {
  Project,
  ProjectSkillView,
} from '@openthrottle/nestjs-repositories';
import {
  ProjectSkillsService,
  ProjectsService,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ProjectSkillsResolver } from './project-skills.resolver';

describe('ProjectSkillsResolver', () => {
  const dogfoodProject = createMock<Project>({
    id: 'monorepo-project-id',
    nxProjectName: 'OpenThrottle/monorepo',
  });

  const views: ProjectSkillView[] = [
    {
      description: 'Ralph loop.',
      slug: 'agents-ralph',
      source: 'openthrottle',
      sourceUrl: undefined,
      staticDisableModelInvocation: false,
      tags: ['planning'],
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
      description: 'Commit helper.',
      slug: 'github-commit',
      source: 'external',
      sourceUrl: 'https://example.com/skills/github-commit',
      staticDisableModelInvocation: true,
      tags: ['git', 'github'],
    },
  ];

  const mockProjectSkillsService = createMock<ProjectSkillsService>({
    getSkillsForProject: vi.fn(),
  });
  const mockProjectsService = createMock<ProjectsService>({
    findByNxProjectName: vi.fn(),
  });

  let resolver: ProjectSkillsResolver;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = await Test.createTestingModule({
      providers: [
        ProjectSkillsResolver,
        { provide: ProjectSkillsService, useValue: mockProjectSkillsService },
        { provide: ProjectsService, useValue: mockProjectsService },
      ],
    }).compile();

    resolver = app.get(ProjectSkillsResolver);
  });

  test('returns the project universe with the tri-state static flag mapped to null when unset', async () => {
    vi.mocked(mockProjectSkillsService.getSkillsForProject).mockResolvedValue(
      views,
    );

    const result = await resolver.projectSkills('explicit-project-id');

    expect(mockProjectsService.findByNxProjectName).not.toHaveBeenCalled();
    expect(mockProjectSkillsService.getSkillsForProject).toHaveBeenCalledWith(
      'explicit-project-id',
    );
    expect(result).toEqual({
      skills: [
        {
          description: 'Ralph loop.',
          slug: 'agents-ralph',
          source: 'openthrottle',
          sourceUrl: null,
          staticDisableModelInvocation: false,
          tags: ['planning'],
        },
        {
          description: null,
          slug: 'git-commit',
          source: 'external',
          sourceUrl: null,
          staticDisableModelInvocation: null,
          tags: [],
        },
        {
          description: 'Commit helper.',
          slug: 'github-commit',
          source: 'external',
          sourceUrl: 'https://example.com/skills/github-commit',
          staticDisableModelInvocation: true,
          tags: ['git', 'github'],
        },
      ],
      totalCount: 3,
    });
  });

  test('resolves the dogfood monorepo project when projectId is omitted', async () => {
    vi.mocked(mockProjectsService.findByNxProjectName).mockResolvedValue(
      dogfoodProject,
    );
    vi.mocked(mockProjectSkillsService.getSkillsForProject).mockResolvedValue(
      [],
    );

    const result = await resolver.projectSkills();

    expect(mockProjectsService.findByNxProjectName).toHaveBeenCalledWith(
      'OpenThrottle/monorepo',
    );
    expect(mockProjectSkillsService.getSkillsForProject).toHaveBeenCalledWith(
      'monorepo-project-id',
    );
    expect(result).toEqual({ skills: [], totalCount: 0 });
  });

  test('returns an empty list when the dogfood project is absent (never queries skills)', async () => {
    vi.mocked(mockProjectsService.findByNxProjectName).mockResolvedValue(null);

    const result = await resolver.projectSkills();

    expect(result).toEqual({ skills: [], totalCount: 0 });
    expect(mockProjectSkillsService.getSkillsForProject).not.toHaveBeenCalled();
  });
});
