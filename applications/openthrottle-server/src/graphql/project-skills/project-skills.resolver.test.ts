import type {
  Project,
  ProjectSkillView,
} from '@openthrottle/nestjs-repositories';
import {
  ProjectSkillsService,
  ProjectsService,
  ServiceAccountsService,
} from '@openthrottle/nestjs-repositories';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { ProjectSkillsResolver } from './project-skills.resolver';

describe('ProjectSkillsResolver', () => {
  const dogfoodProject = createMock<Project>({
    id: 'monorepo-project-id',
    nxProjectName: 'OpenThrottle/monorepo',
  });

  const views: ProjectSkillView[] = [
    {
      description: 'Ralph loop.',
      orphanedAt: undefined,
      slug: 'agents-ralph',
      source: 'openthrottle',
      sourceUrl: undefined,
      staticDisableModelInvocation: false,
      tags: ['planning'],
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
      description: 'Commit helper.',
      orphanedAt: undefined,
      slug: 'github-commit',
      source: 'external',
      sourceUrl: 'https://example.com/skills/github-commit',
      staticDisableModelInvocation: true,
      tags: ['git', 'github'],
    },
  ];

  const userPrincipal: AuthPrincipal = createMock<AuthPrincipal>({
    kind: AUTH_PRINCIPAL_KIND_USER,
    sub: 'user-1',
  });

  const taggedView: ProjectSkillView = {
    description: 'Commit helper.',
    orphanedAt: undefined,
    slug: 'github-commit',
    source: 'external',
    sourceUrl: undefined,
    staticDisableModelInvocation: undefined,
    tags: ['github'],
  };

  const mockProjectSkillsService = createMock<ProjectSkillsService>({
    addProjectSkillTag: vi.fn(),
    getSkillsForProject: vi.fn(),
    removeProjectSkill: vi.fn(),
    removeProjectSkillTag: vi.fn(),
  });
  const mockProjectsService = createMock<ProjectsService>({
    findByNxProjectName: vi.fn(),
  });
  const mockServiceAccountsService = createMock<ServiceAccountsService>();

  let resolver: ProjectSkillsResolver;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = await Test.createTestingModule({
      providers: [
        ProjectSkillsResolver,
        { provide: ProjectSkillsService, useValue: mockProjectSkillsService },
        { provide: ProjectsService, useValue: mockProjectsService },
        {
          provide: ServiceAccountsService,
          useValue: mockServiceAccountsService,
        },
      ],
    })
      .overrideGuard(GqlPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

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
      orphanSlugs: [],
      skills: [
        {
          description: 'Ralph loop.',
          orphanedAt: null,
          slug: 'agents-ralph',
          source: 'openthrottle',
          sourceUrl: null,
          staticDisableModelInvocation: false,
          tags: ['planning'],
        },
        {
          description: null,
          orphanedAt: null,
          slug: 'git-commit',
          source: 'external',
          sourceUrl: null,
          staticDisableModelInvocation: null,
          tags: [],
        },
        {
          description: 'Commit helper.',
          orphanedAt: null,
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
    expect(result).toEqual({ orphanSlugs: [], skills: [], totalCount: 0 });
  });

  test('returns an empty list when the dogfood project is absent (never queries skills)', async () => {
    vi.mocked(mockProjectsService.findByNxProjectName).mockResolvedValue(null);

    const result = await resolver.projectSkills();

    expect(result).toEqual({ orphanSlugs: [], skills: [], totalCount: 0 });
    expect(mockProjectSkillsService.getSkillsForProject).not.toHaveBeenCalled();
  });

  test('lists orphan slugs for DB rows that ingest marked missing from disk', async () => {
    vi.mocked(mockProjectSkillsService.getSkillsForProject).mockResolvedValue([
      {
        description: undefined,
        orphanedAt: new Date('2026-08-14T00:00:00.000Z'),
        slug: 'vanished',
        source: 'external',
        sourceUrl: undefined,
        staticDisableModelInvocation: undefined,
        tags: ['github'],
      },
    ]);

    const result = await resolver.projectSkills('explicit-project-id');

    expect(result.orphanSlugs).toEqual(['vanished']);
    expect(result.skills[0]?.orphanedAt).toEqual(
      new Date('2026-08-14T00:00:00.000Z'),
    );
  });

  test('removeProjectSkill deletes one row on the explicit project', async () => {
    vi.mocked(mockProjectSkillsService.removeProjectSkill).mockResolvedValue(
      true,
    );

    await expect(
      resolver.removeProjectSkill('vanished', 'explicit-project-id'),
    ).resolves.toBe(true);
    expect(mockProjectsService.findByNxProjectName).not.toHaveBeenCalled();
    expect(mockProjectSkillsService.removeProjectSkill).toHaveBeenCalledWith(
      'explicit-project-id',
      'vanished',
    );
  });

  test('removeProjectSkill returns false when the dogfood project is absent', async () => {
    vi.mocked(mockProjectsService.findByNxProjectName).mockResolvedValue(null);

    await expect(resolver.removeProjectSkill('vanished')).resolves.toBe(false);
    expect(mockProjectSkillsService.removeProjectSkill).not.toHaveBeenCalled();
  });

  test('addProjectSkillTag attaches a tag on the explicit project', async () => {
    vi.mocked(mockProjectSkillsService.addProjectSkillTag).mockResolvedValue(
      taggedView,
    );

    const result = await resolver.addProjectSkillTag(userPrincipal, {
      projectId: 'explicit-project-id',
      slug: 'github-commit',
      tag: 'github',
    });

    expect(mockProjectsService.findByNxProjectName).not.toHaveBeenCalled();
    expect(mockProjectSkillsService.addProjectSkillTag).toHaveBeenCalledWith(
      { principalKind: 'user', subjectId: 'user-1' },
      'explicit-project-id',
      'github-commit',
      'github',
    );
    expect(result).toEqual({
      description: 'Commit helper.',
      orphanedAt: null,
      slug: 'github-commit',
      source: 'external',
      sourceUrl: null,
      staticDisableModelInvocation: null,
      tags: ['github'],
    });
  });

  test('addProjectSkillTag throws when the dogfood project is absent', async () => {
    vi.mocked(mockProjectsService.findByNxProjectName).mockResolvedValue(null);

    await expect(
      resolver.addProjectSkillTag(userPrincipal, {
        projectId: undefined,
        slug: 'github-commit',
        tag: 'github',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(mockProjectSkillsService.addProjectSkillTag).not.toHaveBeenCalled();
  });

  test('removeProjectSkillTag returns false when the dogfood project is absent', async () => {
    vi.mocked(mockProjectsService.findByNxProjectName).mockResolvedValue(null);

    await expect(
      resolver.removeProjectSkillTag({
        projectId: undefined,
        slug: 'github-commit',
        tag: 'github',
      }),
    ).resolves.toBe(false);
    expect(
      mockProjectSkillsService.removeProjectSkillTag,
    ).not.toHaveBeenCalled();
  });

  test('removeProjectSkillTag delegates to the service on an explicit project', async () => {
    vi.mocked(mockProjectSkillsService.removeProjectSkillTag).mockResolvedValue(
      true,
    );

    await expect(
      resolver.removeProjectSkillTag({
        projectId: 'explicit-project-id',
        slug: 'github-commit',
        tag: 'github',
      }),
    ).resolves.toBe(true);
    expect(mockProjectSkillsService.removeProjectSkillTag).toHaveBeenCalledWith(
      'explicit-project-id',
      'github-commit',
      'github',
    );
  });
});
