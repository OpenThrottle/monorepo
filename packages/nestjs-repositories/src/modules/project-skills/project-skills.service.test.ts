import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { ProjectSkillInput } from '@openthrottle/openthrottle-skills';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillTagsService } from '../skill-tags/skill-tags.service';
import type { TagCaller } from '../tags/tag-provenance';
import { ProjectSkill } from './project-skill.entity';
import { ProjectSkillsService } from './project-skills.service';

describe('ProjectSkillsService', () => {
  const projectId = '22222222-2222-4222-8222-222222222222';

  const makeRow = (
    overrides: Partial<ProjectSkill> & Pick<ProjectSkill, 'slug'>,
  ): ProjectSkill =>
    asMock<ProjectSkill>({
      createdAt: new Date('2026-07-11T12:00:00.000Z'),
      disableModelInvocation: null,
      id: `id-${overrides.slug}`,
      ingestedAt: new Date('2026-07-11T12:00:00.000Z'),
      orphanedAt: null,
      projectId,
      source: 'external',
      sourcePath: `.agents/skills/${overrides.slug}/SKILL.md`,
      sourceUrl: null,
      tags: [],
      updatedAt: new Date('2026-07-11T12:00:00.000Z'),
      ...overrides,
    });

  const mockRepository = {
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  };

  const mockSkillTagsService = createMock<SkillTagsService>({
    listForUser: vi.fn(),
  });

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
        {
          provide: getRepositoryToken(ProjectSkill),
          useValue: mockRepository,
        },
        { provide: SkillTagsService, useValue: mockSkillTagsService },
      ],
    }).compile();

    service = app.get(ProjectSkillsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSkillsForProject', () => {
    it('projects rows and preserves the tri-state static flag', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({
          description: 'Commit helper.',
          disableModelInvocation: true,
          slug: 'github-commit',
          tags: ['github'],
        }),
        makeRow({ disableModelInvocation: false, slug: 'agents-ralph' }),
        makeRow({ disableModelInvocation: null, slug: 'improve' }),
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
          slug: 'agents-ralph',
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
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { slug: 'ASC' },
        where: { projectId },
      });
    });

    it('projects source and sourceUrl and normalizes them in the view', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
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
      vi.mocked(mockRepository.find).mockResolvedValue([]);

      await expect(service.getSkillsForProject(projectId)).resolves.toEqual([]);
    });
  });

  describe('reconcileProjectSkills', () => {
    const input = (
      overrides: Partial<ProjectSkillInput> & Pick<ProjectSkillInput, 'slug'>,
    ): ProjectSkillInput => ({
      description: null,
      disableModelInvocation: undefined,
      source: 'external',
      sourcePath: `.agents/skills/${overrides.slug}/SKILL.md`,
      sourceUrl: undefined,
      tags: [],
      ...overrides,
    });

    it('updates existing slugs without overwriting tags and marks vanished slugs as orphans', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'kept', tags: ['github'] }),
        makeRow({ slug: 'stale-one' }),
        makeRow({ slug: 'stale-two' }),
      ]);

      const result = await service.reconcileProjectSkills(projectId, [
        input({
          description: 'Keeps things.',
          disableModelInvocation: true,
          slug: 'kept',
          tags: ['docs'],
        }),
      ]);

      expect(mockRepository.insert).not.toHaveBeenCalled();
      expect(mockRepository.delete).not.toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalledWith(
        { projectId, slug: 'kept' },
        expect.objectContaining({
          description: 'Keeps things.',
          disableModelInvocation: true,
          orphanedAt: null,
          sourcePath: '.agents/skills/kept/SKILL.md',
        }),
      );
      const keptPayload = vi
        .mocked(mockRepository.update)
        .mock.calls.find((call) => call[0]?.slug === 'kept')?.[1];
      expect(keptPayload).not.toHaveProperty('tags');
      expect(mockRepository.update).toHaveBeenCalledWith(
        { projectId, slug: 'stale-one' },
        expect.objectContaining({ orphanedAt: expect.any(Date) }),
      );
      expect(mockRepository.update).toHaveBeenCalledWith(
        { projectId, slug: 'stale-two' },
        expect.objectContaining({ orphanedAt: expect.any(Date) }),
      );
      expect(result).toEqual({
        staleSlugs: ['stale-one', 'stale-two'],
        upserted: 1,
      });
    });

    it('inserts a brand-new slug with empty tags', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([]);

      const result = await service.reconcileProjectSkills(projectId, [
        input({
          description: 'New skill.',
          slug: 'brand-new',
          tags: ['github'],
        }),
      ]);

      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockRepository.insert).toHaveBeenCalledTimes(1);
      expect(mockRepository.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          description: 'New skill.',
          orphanedAt: null,
          projectId,
          slug: 'brand-new',
          tags: [],
        }),
      ]);
      expect(result).toEqual({ staleSlugs: [], upserted: 1 });
    });

    it('does not stamp orphanedAt again when the slug is already orphaned', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({
          orphanedAt: new Date('2026-08-01T00:00:00.000Z'),
          slug: 'gone',
        }),
      ]);

      const result = await service.reconcileProjectSkills(projectId, []);

      expect(mockRepository.delete).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual({ staleSlugs: ['gone'], upserted: 0 });
    });

    it('carries source into the update row and normalizes an unset sourceUrl to null', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'owned' }),
      ]);

      await service.reconcileProjectSkills(projectId, [
        input({ slug: 'owned', source: 'openthrottle' }),
      ]);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { projectId, slug: 'owned' },
        expect.objectContaining({
          source: 'openthrottle',
          sourceUrl: null,
        }),
      );
    });

    it('normalizes an unset flag to null in the update row', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'improve' }),
      ]);

      await service.reconcileProjectSkills(projectId, [
        input({ slug: 'improve' }),
      ]);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { projectId, slug: 'improve' },
        expect.objectContaining({ disableModelInvocation: null }),
      );
    });

    it('marks every row orphaned and skips insert when the input set is empty', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'gone-one' }),
        makeRow({ slug: 'gone-two' }),
      ]);

      const result = await service.reconcileProjectSkills(projectId, []);

      expect(mockRepository.insert).not.toHaveBeenCalled();
      expect(mockRepository.delete).not.toHaveBeenCalled();
      expect(result).toEqual({
        staleSlugs: ['gone-one', 'gone-two'],
        upserted: 0,
      });
    });

    it('performs no orphan stamp when nothing is stale', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'kept' }),
      ]);

      const result = await service.reconcileProjectSkills(projectId, [
        input({ slug: 'kept' }),
      ]);

      expect(mockRepository.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ staleSlugs: [], upserted: 1 });
    });
  });

  describe('removeProjectSkill', () => {
    it('deletes the matching row and returns true', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 1 });

      await expect(service.removeProjectSkill(projectId, 'gone')).resolves.toBe(
        true,
      );
      expect(mockRepository.delete).toHaveBeenCalledWith({
        projectId,
        slug: 'gone',
      });
    });

    it('returns false when no row matched', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 0 });

      await expect(
        service.removeProjectSkill(projectId, 'missing'),
      ).resolves.toBe(false);
    });
  });

  describe('addProjectSkillTag', () => {
    it('appends a domain tag and sorts the array', async () => {
      vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue([
        asMock({ dimension: 'domain', tag: 'github' }),
      ]);
      vi.mocked(mockRepository.findOne).mockResolvedValue(
        makeRow({ slug: 'github-commit', tags: ['git'] }),
      );

      const result = await service.addProjectSkillTag(
        userCaller,
        projectId,
        'github-commit',
        'github',
      );

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 'id-github-commit' },
        { tags: ['git', 'github'] },
      );
      expect(result.tags).toEqual(['git', 'github']);
    });

    it('is idempotent when the tag is already present', async () => {
      vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue([
        asMock({ dimension: 'domain', tag: 'github' }),
      ]);
      vi.mocked(mockRepository.findOne).mockResolvedValue(
        makeRow({ slug: 'github-commit', tags: ['github'] }),
      );

      const result = await service.addProjectSkillTag(
        userCaller,
        projectId,
        'github-commit',
        'github',
      );

      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(result.tags).toEqual(['github']);
    });

    it('rejects an unknown tag', async () => {
      vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue([
        asMock({ dimension: 'domain', tag: 'github' }),
      ]);

      await expect(
        service.addProjectSkillTag(
          userCaller,
          projectId,
          'github-commit',
          'not-a-vocab-tag',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });

    it('rejects a phase tag', async () => {
      vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue([
        asMock({ dimension: 'phase', tag: 'breakdown' }),
      ]);

      await expect(
        service.addProjectSkillTag(
          userCaller,
          projectId,
          'github-commit',
          'breakdown',
        ),
      ).rejects.toThrow(/Phase tag "breakdown"/);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
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
      vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue([
        asMock({ dimension: 'domain', tag: 'github' }),
      ]);
      vi.mocked(mockRepository.findOne).mockResolvedValue(null);

      await expect(
        service.addProjectSkillTag(userCaller, projectId, 'missing', 'github'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeProjectSkillTag', () => {
    it('removes a present tag and returns true', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(
        makeRow({ slug: 'github-commit', tags: ['git', 'github'] }),
      );

      await expect(
        service.removeProjectSkillTag(projectId, 'github-commit', 'github'),
      ).resolves.toBe(true);
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 'id-github-commit' },
        { tags: ['git'] },
      );
    });

    it('returns false when the row is missing', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(null);

      await expect(
        service.removeProjectSkillTag(projectId, 'missing', 'github'),
      ).resolves.toBe(false);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });

    it('returns false when the tag is not on the row', async () => {
      vi.mocked(mockRepository.findOne).mockResolvedValue(
        makeRow({ slug: 'github-commit', tags: ['git'] }),
      );

      await expect(
        service.removeProjectSkillTag(projectId, 'github-commit', 'github'),
      ).resolves.toBe(false);
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });
});
