import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { ProjectSkillInput } from '@openthrottle/openthrottle-skills';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
    upsert: vi.fn(),
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
          slug: 'github-commit',
          source: 'external',
          sourceUrl: undefined,
          staticDisableModelInvocation: true,
          tags: ['github'],
        },
        {
          description: undefined,
          slug: 'agents-ralph',
          source: 'external',
          sourceUrl: undefined,
          staticDisableModelInvocation: false,
          tags: [],
        },
        {
          description: undefined,
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

    it('upserts inputs on (projectId, slug) and deletes vanished slugs', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'kept' }),
        makeRow({ slug: 'stale-one' }),
        makeRow({ slug: 'stale-two' }),
      ]);
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 2 });

      const result = await service.reconcileProjectSkills(projectId, [
        input({
          description: 'Keeps things.',
          disableModelInvocation: true,
          slug: 'kept',
          tags: ['github'],
        }),
      ]);

      expect(mockRepository.upsert).toHaveBeenCalledTimes(1);
      const [rows, options] =
        vi.mocked(mockRepository.upsert).mock.calls[0] ?? [];
      expect(options).toEqual({ conflictPaths: ['projectId', 'slug'] });
      expect(rows).toEqual([
        expect.objectContaining({
          description: 'Keeps things.',
          disableModelInvocation: true,
          projectId,
          slug: 'kept',
          sourcePath: '.agents/skills/kept/SKILL.md',
          tags: ['github'],
        }),
      ]);

      const [deleteCriteria] =
        vi.mocked(mockRepository.delete).mock.calls[0] ?? [];
      expect(deleteCriteria).toMatchObject({ projectId });
      expect(result).toEqual({ deleted: 2, upserted: 1 });
    });

    it('carries source into the upsert row and normalizes an unset sourceUrl to null', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'owned' }),
      ]);

      await service.reconcileProjectSkills(projectId, [
        input({ slug: 'owned', source: 'openthrottle' }),
      ]);

      const [rows] = vi.mocked(mockRepository.upsert).mock.calls[0] ?? [];
      expect(rows?.[0]).toMatchObject({
        source: 'openthrottle',
        sourceUrl: null,
      });
    });

    it('normalizes an unset flag to null in the upsert row', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'improve' }),
      ]);

      await service.reconcileProjectSkills(projectId, [
        input({ slug: 'improve' }),
      ]);

      const [rows] = vi.mocked(mockRepository.upsert).mock.calls[0] ?? [];
      expect(rows?.[0]).toMatchObject({ disableModelInvocation: null });
    });

    it('deletes all rows and skips upsert when the input set is empty', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'gone-one' }),
        makeRow({ slug: 'gone-two' }),
      ]);
      vi.mocked(mockRepository.delete).mockResolvedValue({ affected: 2 });

      const result = await service.reconcileProjectSkills(projectId, []);

      expect(mockRepository.upsert).not.toHaveBeenCalled();
      expect(mockRepository.delete).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ deleted: 2, upserted: 0 });
    });

    it('performs no delete when nothing is stale', async () => {
      vi.mocked(mockRepository.find).mockResolvedValue([
        makeRow({ slug: 'kept' }),
      ]);

      const result = await service.reconcileProjectSkills(projectId, [
        input({ slug: 'kept' }),
      ]);

      expect(mockRepository.delete).not.toHaveBeenCalled();
      expect(result).toEqual({ deleted: 0, upserted: 1 });
    });
  });
});
