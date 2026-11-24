import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { ProjectSkill } from '@openthrottle/nestjs-repositories-server';
import {
  ProjectSkillsRepository,
  SkillTagsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createProjectSkillsRepositoryMock,
  createSkillTagsRepositoryMock,
  projectSkillsFactory,
  skillTagsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TagCaller } from '../tags/tags.types.ts';
import { ProjectSkillsService } from './project-skills.service.ts';

describe('ProjectSkillsService', () => {
  const projectId = '22222222-2222-4222-8222-222222222222';

  const makeRow = (
    overrides: Partial<ProjectSkill> & Pick<ProjectSkill, 'slug'>,
  ): ProjectSkill => {
    return projectSkillsFactory.build({
      id: `id-${overrides.slug}`,
      projectId,
      sourcePath: `.agents/skills/${overrides.slug}/SKILL.md`,
      ...overrides,
    });
  };

  const projectSkillsRepository = createProjectSkillsRepositoryMock();
  const skillTagsRepository = createSkillTagsRepositoryMock();

  const userCaller: TagCaller = {
    principalKind: 'user',
    subjectId: 'user-1',
  };

  let service: ProjectSkillsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        ProjectSkillsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: ProjectSkillsRepository, useValue: projectSkillsRepository },
        { provide: SkillTagsRepository, useValue: skillTagsRepository },
      ],
    }).compile();

    service = app.get(ProjectSkillsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    projectSkillsRepository.findByProjectAndSlug.mockResolvedValue(null);
    projectSkillsRepository.listForProject.mockResolvedValue([]);
    projectSkillsRepository.removeBySlug.mockResolvedValue(false);
    projectSkillsRepository.update.mockImplementation(async (id, input) => {
      return projectSkillsFactory.build({ id, ...input });
    });
  });

  describe('getSkillsForProject', () => {
    it('maps outcome_telemetry to staticOutcomeTelemetry', async () => {
      projectSkillsRepository.listForProject.mockResolvedValue([
        makeRow({ outcomeTelemetry: 'none', slug: 'ot-stack' }),
        makeRow({ outcomeTelemetry: null, slug: 'ot-loop' }),
        makeRow({ outcomeTelemetry: 'garbage', slug: 'odd' }),
      ]);

      const result = await service.getSkillsForProject(projectId);

      expect(result.map((view) => view.staticOutcomeTelemetry)).toEqual([
        'none',
        undefined,
        undefined,
      ]);
    });

    it('projects rows and preserves the tri-state static flag', async () => {
      projectSkillsRepository.listForProject.mockResolvedValue([
        makeRow({
          description: 'Commit helper.',
          disableModelInvocation: true,
          slug: 'github-commit',
          tags: ['github'],
        }),
        makeRow({
          description: null,
          disableModelInvocation: false,
          slug: 'ot-loop',
        }),
        makeRow({
          description: null,
          disableModelInvocation: null,
          slug: 'improve',
        }),
      ]);

      const result = await service.getSkillsForProject(projectId);

      expect(result).toEqual([
        {
          description: 'Commit helper.',
          orphanedAt: undefined,
          slug: 'github-commit',
          source: 'external',
          sourceUrl: undefined,
          staticDisableModelInvocation: true,
          tags: ['github'],
        },
        {
          description: undefined,
          orphanedAt: undefined,
          slug: 'ot-loop',
          source: 'external',
          sourceUrl: undefined,
          staticDisableModelInvocation: false,
          tags: [],
        },
        {
          description: undefined,
          orphanedAt: undefined,
          slug: 'improve',
          source: 'external',
          sourceUrl: undefined,
          staticDisableModelInvocation: undefined,
          tags: [],
        },
      ]);
      expect(projectSkillsRepository.listForProject).toHaveBeenCalledWith(
        projectId,
      );
    });

    it('projects source and sourceUrl and normalizes them in the view', async () => {
      projectSkillsRepository.listForProject.mockResolvedValue([
        makeRow({ slug: 'owned', source: 'openthrottle' }),
        makeRow({
          slug: 'vendored',
          sourceUrl: 'https://example.com/skills/vendored',
        }),
      ]);

      const result = await service.getSkillsForProject(projectId);

      expect(result[0]).toMatchObject({
        slug: 'owned',
        source: 'openthrottle',
      });
      expect(result[1]).toMatchObject({
        slug: 'vendored',
        source: 'external',
        sourceUrl: 'https://example.com/skills/vendored',
      });
    });

    it('returns an empty list for a project with no skills', async () => {
      await expect(service.getSkillsForProject(projectId)).resolves.toEqual([]);
    });
  });

  describe('removeProjectSkill', () => {
    it('soft deletes the matching row and returns true', async () => {
      projectSkillsRepository.removeBySlug.mockResolvedValue(true);

      await expect(service.removeProjectSkill(projectId, 'gone')).resolves.toBe(
        true,
      );
      expect(projectSkillsRepository.removeBySlug).toHaveBeenCalledWith(
        projectId,
        'gone',
      );
    });

    it('returns false when no row matched', async () => {
      await expect(
        service.removeProjectSkill(projectId, 'missing'),
      ).resolves.toBe(false);
    });
  });

  describe('addProjectSkillTag', () => {
    const withVocabulary = (dimension: string, tag: string): void => {
      skillTagsRepository.listForUser.mockResolvedValue([
        skillTagsFactory.build({ dimension, tag }),
      ]);
    };

    it('appends a domain tag and sorts the array', async () => {
      withVocabulary('domain', 'github');
      projectSkillsRepository.findByProjectAndSlug.mockResolvedValue(
        makeRow({ slug: 'github-commit', tags: ['git'] }),
      );

      const result = await service.addProjectSkillTag(
        userCaller,
        projectId,
        'github-commit',
        'github',
      );

      expect(projectSkillsRepository.update).toHaveBeenCalledWith(
        'id-github-commit',
        { tags: ['git', 'github'] },
      );
      expect(result.tags).toEqual(['git', 'github']);
    });

    it('is idempotent when the tag is already present', async () => {
      withVocabulary('domain', 'github');
      projectSkillsRepository.findByProjectAndSlug.mockResolvedValue(
        makeRow({ slug: 'github-commit', tags: ['github'] }),
      );

      const result = await service.addProjectSkillTag(
        userCaller,
        projectId,
        'github-commit',
        'github',
      );

      expect(projectSkillsRepository.update).not.toHaveBeenCalled();
      expect(result.tags).toEqual(['github']);
    });

    it('rejects an unknown tag', async () => {
      withVocabulary('domain', 'github');

      await expect(
        service.addProjectSkillTag(
          userCaller,
          projectId,
          'github-commit',
          'not-a-vocab-tag',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(
        projectSkillsRepository.findByProjectAndSlug,
      ).not.toHaveBeenCalled();
    });

    it('rejects a phase tag', async () => {
      withVocabulary('phase', 'breakdown');

      await expect(
        service.addProjectSkillTag(
          userCaller,
          projectId,
          'github-commit',
          'breakdown',
        ),
      ).rejects.toThrow(/Phase tag "breakdown"/);
      expect(
        projectSkillsRepository.findByProjectAndSlug,
      ).not.toHaveBeenCalled();
    });

    it('rejects a non-kebab-case tag', async () => {
      await expect(
        service.addProjectSkillTag(
          userCaller,
          projectId,
          'github-commit',
          'GitHub',
        ),
      ).rejects.toThrow(/kebab-case/);
    });

    it('throws when the skill row is missing', async () => {
      withVocabulary('domain', 'github');

      await expect(
        service.addProjectSkillTag(userCaller, projectId, 'missing', 'github'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeProjectSkillTag', () => {
    it('removes a present tag and returns true', async () => {
      projectSkillsRepository.findByProjectAndSlug.mockResolvedValue(
        makeRow({ slug: 'github-commit', tags: ['git', 'github'] }),
      );

      await expect(
        service.removeProjectSkillTag(projectId, 'github-commit', 'github'),
      ).resolves.toBe(true);
      expect(projectSkillsRepository.update).toHaveBeenCalledWith(
        'id-github-commit',
        { tags: ['git'] },
      );
    });

    it('returns false when the row is missing', async () => {
      await expect(
        service.removeProjectSkillTag(projectId, 'missing', 'github'),
      ).resolves.toBe(false);
      expect(projectSkillsRepository.update).not.toHaveBeenCalled();
    });

    it('returns false when the tag is not on the row', async () => {
      projectSkillsRepository.findByProjectAndSlug.mockResolvedValue(
        makeRow({ slug: 'github-commit', tags: ['git'] }),
      );

      await expect(
        service.removeProjectSkillTag(projectId, 'github-commit', 'github'),
      ).resolves.toBe(false);
      expect(projectSkillsRepository.update).not.toHaveBeenCalled();
    });
  });
});
