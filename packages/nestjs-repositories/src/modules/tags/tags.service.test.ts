import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillTagsService } from '../skill-tags/skill-tags.service';
import type { UserSkillTag } from '../skill-tags/user-skill-tag.entity';
import { PlanTag } from './plan-tag.entity';
import { ProjectTag } from './project-tag.entity';
import { TaskTag } from './task-tag.entity';
import {
  deriveTagSource,
  TAG_SOURCES,
  TAGGING_SERVICE_ACCOUNT_NAME,
  type TagCaller,
  type TagSource,
} from './tag-provenance';
import { TagsService } from './tags.service';

describe('deriveTagSource', () => {
  it('classifies a user principal as human', () => {
    expect(deriveTagSource({ principalKind: 'user', subjectId: 'u1' })).toBe(
      TAG_SOURCES.HUMAN,
    );
  });

  it('classifies a generic service account as agent', () => {
    expect(
      deriveTagSource({
        principalKind: 'service_account',
        serviceAccountName: 'openthrottle-mcp',
        subjectId: 'sa1',
      }),
    ).toBe(TAG_SOURCES.AGENT);
  });

  it('classifies the tagging service account as server-llm', () => {
    expect(
      deriveTagSource({
        principalKind: 'service_account',
        serviceAccountName: TAGGING_SERVICE_ACCOUNT_NAME,
        subjectId: 'sa2',
      }),
    ).toBe(TAG_SOURCES.SERVER_LLM);
  });
});

describe('TagsService', () => {
  const planId = '22222222-2222-4222-8222-222222222222';
  const taskId = '33333333-3333-4333-8333-333333333333';
  const projectId = '66666666-6666-4666-8666-666666666666';

  const humanCaller: TagCaller = {
    principalKind: 'user',
    subjectId: '11111111-1111-4111-8111-111111111111',
  };
  const agentCaller: TagCaller = {
    principalKind: 'service_account',
    serviceAccountName: 'openthrottle-mcp',
    subjectId: '44444444-4444-4444-8444-444444444444',
  };
  const taggingCaller: TagCaller = {
    principalKind: 'service_account',
    serviceAccountName: TAGGING_SERVICE_ACCOUNT_NAME,
    subjectId: '55555555-5555-4555-8555-555555555555',
  };

  const vocabularyRow = (tag: string, dimension: string): UserSkillTag =>
    asMock<UserSkillTag>({ dimension, tag });

  const defaultVocabulary = [
    vocabularyRow('backend', 'domain'),
    vocabularyRow('breakdown', 'phase'),
    vocabularyRow('design', 'phase'),
    vocabularyRow('github', 'domain'),
  ];

  const planTagRow = (tag: string, source: TagSource): PlanTag =>
    asMock<PlanTag>({
      confidence: null,
      dimension: tag === 'breakdown' || tag === 'design' ? 'phase' : 'domain',
      id: `plan-tag-${tag}-${source}`,
      planId,
      source,
      tag,
    });

  const taskTagRow = (tag: string, source: TagSource): TaskTag =>
    asMock<TaskTag>({
      confidence: null,
      dimension: 'domain',
      id: `task-tag-${tag}-${source}`,
      source,
      tag,
      taskId,
    });

  const projectTagRow = (tag: string, source: TagSource): ProjectTag =>
    asMock<ProjectTag>({
      confidence: null,
      dimension: tag === 'breakdown' || tag === 'design' ? 'phase' : 'domain',
      id: `project-tag-${tag}-${source}`,
      projectId,
      source,
      tag,
    });

  const taskTagsSelectBuilder = {
    andWhere: vi.fn(),
    getMany: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  };
  taskTagsSelectBuilder.innerJoin.mockReturnValue(taskTagsSelectBuilder);
  taskTagsSelectBuilder.where.mockReturnValue(taskTagsSelectBuilder);
  taskTagsSelectBuilder.andWhere.mockReturnValue(taskTagsSelectBuilder);

  const projectTagsSelectBuilder = {
    andWhere: vi.fn(),
    getMany: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
  };
  projectTagsSelectBuilder.innerJoin.mockReturnValue(projectTagsSelectBuilder);
  projectTagsSelectBuilder.where.mockReturnValue(projectTagsSelectBuilder);
  projectTagsSelectBuilder.andWhere.mockReturnValue(projectTagsSelectBuilder);

  const mockPlanTagsRepository = {
    create: vi.fn((data: Partial<PlanTag>) => ({ ...data })),
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: PlanTag) => Promise.resolve(entity)),
  };

  const mockTaskTagsRepository = {
    create: vi.fn((data: Partial<TaskTag>) => ({ ...data })),
    createQueryBuilder: vi.fn(() => taskTagsSelectBuilder),
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: TaskTag) => Promise.resolve(entity)),
  };

  const mockProjectTagsRepository = {
    create: vi.fn((data: Partial<ProjectTag>) => ({ ...data })),
    createQueryBuilder: vi.fn(() => projectTagsSelectBuilder),
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: ProjectTag) => Promise.resolve(entity)),
  };

  const mockVocabularyRepository = { find: vi.fn() };

  const mockSkillTagsService = {
    getRepository: vi.fn(() => mockVocabularyRepository),
    listForUser: vi.fn(),
  };

  let service: TagsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(PlanTag),
          useValue: mockPlanTagsRepository,
        },
        {
          provide: getRepositoryToken(ProjectTag),
          useValue: mockProjectTagsRepository,
        },
        {
          provide: getRepositoryToken(TaskTag),
          useValue: mockTaskTagsRepository,
        },
        { provide: SkillTagsService, useValue: mockSkillTagsService },
      ],
    }).compile();

    service = app.get(TagsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    taskTagsSelectBuilder.innerJoin.mockReturnValue(taskTagsSelectBuilder);
    taskTagsSelectBuilder.where.mockReturnValue(taskTagsSelectBuilder);
    taskTagsSelectBuilder.andWhere.mockReturnValue(taskTagsSelectBuilder);
    projectTagsSelectBuilder.innerJoin.mockReturnValue(
      projectTagsSelectBuilder,
    );
    projectTagsSelectBuilder.where.mockReturnValue(projectTagsSelectBuilder);
    projectTagsSelectBuilder.andWhere.mockReturnValue(projectTagsSelectBuilder);
    vi.mocked(projectTagsSelectBuilder.getMany).mockResolvedValue([]);
    vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue(
      defaultVocabulary,
    );
    vi.mocked(mockVocabularyRepository.find).mockResolvedValue(
      defaultVocabulary,
    );
  });

  describe('identity-derived source (no API path accepts a source argument)', () => {
    it('stores source=human for a user caller', async () => {
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(null);

      await service.addPlanTag(humanCaller, planId, 'backend');

      expect(mockPlanTagsRepository.create).toHaveBeenCalledWith({
        confidence: null,
        dimension: 'domain',
        planId,
        source: 'human',
        tag: 'backend',
      });
    });

    it('stores source=agent for a generic service-account caller', async () => {
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(null);

      await service.addPlanTag(agentCaller, planId, 'backend');

      expect(mockPlanTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'agent' }),
      );
    });

    it('stores source=server-llm for the tagging service account (confidence kept)', async () => {
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(null);

      await service.addPlanTag(taggingCaller, planId, 'backend', {
        confidence: 0.83,
      });

      expect(mockPlanTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ confidence: 0.83, source: 'server-llm' }),
      );
    });
  });

  describe('vocabulary and dimension validation', () => {
    it('rejects a tag outside the caller vocabulary', async () => {
      await expect(
        service.addPlanTag(humanCaller, planId, 'not-a-known-tag'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockPlanTagsRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a non-kebab-case tag before any lookup', async () => {
      await expect(
        service.addPlanTag(humanCaller, planId, 'Not Valid'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockSkillTagsService.listForUser).not.toHaveBeenCalled();
    });

    it('falls back to the committed default vocabulary for a service account with zero rows', async () => {
      vi.mocked(mockVocabularyRepository.find).mockResolvedValue([]);
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(null);

      await service.addPlanTag(agentCaller, planId, 'breakdown');

      expect(mockPlanTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ dimension: 'phase', tag: 'breakdown' }),
      );
      expect(mockSkillTagsService.listForUser).not.toHaveBeenCalled();
    });
  });

  describe('≤1 phase tag per plan (replace/reject semantics)', () => {
    it('replaces an equal-or-lower-provenance phase tag', async () => {
      const existingPhase = planTagRow('design', 'server-llm');
      vi.mocked(mockPlanTagsRepository.findOne)
        .mockResolvedValueOnce(existingPhase)
        .mockResolvedValueOnce(null);

      await service.addPlanTag(taggingCaller, planId, 'breakdown');

      expect(mockPlanTagsRepository.delete).toHaveBeenCalledWith({
        id: existingPhase.id,
      });
      expect(mockPlanTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ dimension: 'phase', tag: 'breakdown' }),
      );
    });

    it('rejects replacing a higher-provenance phase tag with a ladder explanation', async () => {
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(
        planTagRow('design', 'human'),
      );

      await expect(
        service.addPlanTag(taggingCaller, planId, 'breakdown'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mockPlanTagsRepository.delete).not.toHaveBeenCalled();
      expect(mockPlanTagsRepository.save).not.toHaveBeenCalled();
    });

    it('re-adding the same phase tag is idempotent (no displacement)', async () => {
      const existingPhase = planTagRow('breakdown', 'human');
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(
        existingPhase,
      );

      const result = await service.addPlanTag(humanCaller, planId, 'breakdown');

      expect(result).toBe(existingPhase);
      expect(mockPlanTagsRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('same-tag adds (idempotent upsert)', () => {
    it('upgrades the source when the caller outranks the existing row', async () => {
      const existing = planTagRow('backend', 'server-llm');
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(existing);

      await service.addPlanTag(humanCaller, planId, 'backend');

      expect(mockPlanTagsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'human' }),
      );
    });

    it('is a no-op when the caller does not outrank the existing row', async () => {
      const existing = planTagRow('backend', 'human');
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(existing);

      const result = await service.addPlanTag(agentCaller, planId, 'backend');

      expect(result).toBe(existing);
      expect(mockPlanTagsRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('removal ladder', () => {
    it('rejects an agent removing a human row', async () => {
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(
        planTagRow('backend', 'human'),
      );

      await expect(
        service.removePlanTag(agentCaller, planId, 'backend'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mockPlanTagsRepository.delete).not.toHaveBeenCalled();
    });

    it('rejects server-llm removing an agent row', async () => {
      vi.mocked(mockTaskTagsRepository.findOne).mockResolvedValue(
        taskTagRow('backend', 'agent'),
      );

      await expect(
        service.removeTaskTag(taggingCaller, taskId, 'backend'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows server-llm to remove its own row', async () => {
      const row = planTagRow('backend', 'server-llm');
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(row);

      await expect(
        service.removePlanTag(taggingCaller, planId, 'backend'),
      ).resolves.toBe(true);
      expect(mockPlanTagsRepository.delete).toHaveBeenCalledWith({
        id: row.id,
      });
    });

    it('allows a human to remove anything', async () => {
      vi.mocked(mockTaskTagsRepository.findOne).mockResolvedValue(
        taskTagRow('backend', 'agent'),
      );

      await expect(
        service.removeTaskTag(humanCaller, taskId, 'backend'),
      ).resolves.toBe(true);
    });

    it('returns false when the tag is absent', async () => {
      vi.mocked(mockPlanTagsRepository.findOne).mockResolvedValue(null);

      await expect(
        service.removePlanTag(humanCaller, planId, 'backend'),
      ).resolves.toBe(false);
    });
  });

  describe('project tags (multi-tag, no phase constraint)', () => {
    it('stores source=human for a user caller', async () => {
      vi.mocked(mockProjectTagsRepository.findOne).mockResolvedValue(null);

      await service.addProjectTag(humanCaller, projectId, 'backend');

      expect(mockProjectTagsRepository.create).toHaveBeenCalledWith({
        confidence: null,
        dimension: 'domain',
        projectId,
        source: 'human',
        tag: 'backend',
      });
    });

    it('rejects a tag outside the caller vocabulary', async () => {
      await expect(
        service.addProjectTag(humanCaller, projectId, 'not-a-known-tag'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockProjectTagsRepository.save).not.toHaveBeenCalled();
    });

    it('allows multiple phase tags (no ≤1-phase displacement)', async () => {
      vi.mocked(mockProjectTagsRepository.findOne).mockResolvedValue(null);

      await service.addProjectTag(humanCaller, projectId, 'design');

      expect(mockProjectTagsRepository.delete).not.toHaveBeenCalled();
      expect(mockProjectTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ dimension: 'phase', tag: 'design' }),
      );
    });

    it('upgrades the source on same-tag add when the caller outranks', async () => {
      const existing = projectTagRow('backend', 'server-llm');
      vi.mocked(mockProjectTagsRepository.findOne).mockResolvedValue(existing);

      await service.addProjectTag(humanCaller, projectId, 'backend');

      expect(mockProjectTagsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'human' }),
      );
    });

    it('removal honors the provenance ladder (agent cannot remove human)', async () => {
      vi.mocked(mockProjectTagsRepository.findOne).mockResolvedValue(
        projectTagRow('backend', 'human'),
      );

      await expect(
        service.removeProjectTag(agentCaller, projectId, 'backend'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mockProjectTagsRepository.delete).not.toHaveBeenCalled();
    });

    it('returns false when removing an absent tag', async () => {
      vi.mocked(mockProjectTagsRepository.findOne).mockResolvedValue(null);

      await expect(
        service.removeProjectTag(humanCaller, projectId, 'backend'),
      ).resolves.toBe(false);
    });
  });

  describe('getEffectiveTagSet', () => {
    it('unions plan and task tags, deduped with highest provenance winning', async () => {
      vi.mocked(mockPlanTagsRepository.find).mockResolvedValue([
        planTagRow('backend', 'server-llm'),
        planTagRow('breakdown', 'human'),
      ]);
      vi.mocked(taskTagsSelectBuilder.getMany).mockResolvedValue([
        taskTagRow('backend', 'human'),
        taskTagRow('github', 'agent'),
      ]);

      const result = await service.getEffectiveTagSet(planId);

      expect(result).toEqual([
        expect.objectContaining({ source: 'human', tag: 'backend' }),
        expect.objectContaining({
          dimension: 'phase',
          source: 'human',
          tag: 'breakdown',
        }),
        expect.objectContaining({ source: 'agent', tag: 'github' }),
      ]);
    });

    it("includes the plan's project's tags in the effective set", async () => {
      vi.mocked(mockPlanTagsRepository.find).mockResolvedValue([
        planTagRow('backend', 'human'),
      ]);
      vi.mocked(taskTagsSelectBuilder.getMany).mockResolvedValue([]);
      vi.mocked(projectTagsSelectBuilder.getMany).mockResolvedValue([
        projectTagRow('github', 'human'),
      ]);

      const result = await service.getEffectiveTagSet(planId);

      expect(result).toEqual([
        expect.objectContaining({ source: 'human', tag: 'backend' }),
        expect.objectContaining({ source: 'human', tag: 'github' }),
      ]);
    });

    it('scopes task tags to the given task in task context', async () => {
      vi.mocked(mockPlanTagsRepository.find).mockResolvedValue([]);
      vi.mocked(taskTagsSelectBuilder.getMany).mockResolvedValue([]);

      await service.getEffectiveTagSet(planId, taskId);

      expect(taskTagsSelectBuilder.andWhere).toHaveBeenCalledWith(
        'taskTag.task_id = :taskId',
        { taskId },
      );
    });
  });
});
