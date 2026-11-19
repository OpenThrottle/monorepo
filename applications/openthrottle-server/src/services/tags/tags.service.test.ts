import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  PlanTag,
  ProjectTag,
  TagSource,
  TaskTag,
  UserSkillTag,
} from '@openthrottle/nestjs-repositories-server';
import {
  PlanTagsRepository,
  ProjectTagsRepository,
  SkillTagsRepository,
  TAG_SOURCES,
  TaskTagsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlanTagsRepositoryMock,
  createProjectTagsRepositoryMock,
  createSkillTagsRepositoryMock,
  createTaskTagsRepositoryMock,
  planTagsFactory,
  projectTagsFactory,
  skillTagsFactory,
  taskTagsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { QueryFailedError } from 'typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TAGGING_SERVICE_ACCOUNT_NAME } from './tags.constants.ts';
import { TagsService } from './tags.service.ts';
import type { TagCaller } from './tags.types.ts';
import { deriveTagSource } from './tags.utils.ts';

const queryFailed = (code: string): QueryFailedError => {
  return new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('db error'), { code }),
  );
};

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

  const vocabularyRow = (tag: string, dimension: string): UserSkillTag => {
    return skillTagsFactory.build({ dimension, tag });
  };
  const defaultVocabulary = [
    vocabularyRow('backend', 'domain'),
    vocabularyRow('breakdown', 'phase'),
    vocabularyRow('design', 'phase'),
    vocabularyRow('github', 'domain'),
  ];

  const dimensionOf = (tag: string): string => {
    return tag === 'breakdown' || tag === 'design' ? 'phase' : 'domain';
  };
  const planTagRow = (tag: string, source: TagSource): PlanTag => {
    return planTagsFactory.build({
      dimension: dimensionOf(tag),
      id: `plan-tag-${tag}-${source}`,
      planId,
      source,
      tag,
    });
  };
  const taskTagRow = (tag: string, source: TagSource): TaskTag => {
    return taskTagsFactory.build({
      id: `task-tag-${tag}-${source}`,
      source,
      tag,
      taskId,
    });
  };
  const projectTagRow = (tag: string, source: TagSource): ProjectTag => {
    return projectTagsFactory.build({
      dimension: dimensionOf(tag),
      id: `project-tag-${tag}-${source}`,
      projectId,
      source,
      tag,
    });
  };

  const planTagsRepository = createPlanTagsRepositoryMock();
  const projectTagsRepository = createProjectTagsRepositoryMock();
  const skillTagsRepository = createSkillTagsRepositoryMock();
  const taskTagsRepository = createTaskTagsRepositoryMock();

  let service: TagsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: PlanTagsRepository, useValue: planTagsRepository },
        { provide: ProjectTagsRepository, useValue: projectTagsRepository },
        { provide: SkillTagsRepository, useValue: skillTagsRepository },
        { provide: TaskTagsRepository, useValue: taskTagsRepository },
      ],
    }).compile();

    service = app.get(TagsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    planTagsRepository.create.mockImplementation(async (data) => {
      return planTagsFactory.build(data);
    });
    planTagsRepository.findByPlanAndDimension.mockResolvedValue(null);
    planTagsRepository.findByPlanAndTag.mockResolvedValue(null);
    planTagsRepository.listByPlanId.mockResolvedValue([]);
    planTagsRepository.remove.mockResolvedValue(planTagsFactory.build());
    planTagsRepository.update.mockImplementation(async (id, input) => {
      return planTagsFactory.build({ id, ...input });
    });
    projectTagsRepository.create.mockImplementation(async (data) => {
      return projectTagsFactory.build(data);
    });
    projectTagsRepository.findByProjectAndTag.mockResolvedValue(null);
    projectTagsRepository.listForPlanProject.mockResolvedValue([]);
    projectTagsRepository.remove.mockResolvedValue(projectTagsFactory.build());
    projectTagsRepository.update.mockImplementation(async (id, input) => {
      return projectTagsFactory.build({ id, ...input });
    });
    taskTagsRepository.findByTaskAndTag.mockResolvedValue(null);
    taskTagsRepository.listForPlan.mockResolvedValue([]);
    taskTagsRepository.remove.mockResolvedValue(taskTagsFactory.build());
    skillTagsRepository.listForUser.mockResolvedValue(defaultVocabulary);
    skillTagsRepository.findBy.mockResolvedValue(defaultVocabulary);
  });

  describe('identity-derived source (no API path accepts a source argument)', () => {
    it('stores source=human for a user caller', async () => {
      await service.addPlanTag(humanCaller, planId, 'backend');

      expect(planTagsRepository.create).toHaveBeenCalledWith({
        confidence: null,
        dimension: 'domain',
        planId,
        source: 'human',
        tag: 'backend',
      });
    });

    it('stores source=agent for a generic service-account caller', async () => {
      await service.addPlanTag(agentCaller, planId, 'backend');

      expect(planTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'agent' }),
      );
    });

    it('stores source=server-llm for the tagging service account (confidence kept)', async () => {
      await service.addPlanTag(taggingCaller, planId, 'backend', {
        confidence: 0.83,
      });

      expect(planTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ confidence: 0.83, source: 'server-llm' }),
      );
    });
  });

  describe('vocabulary and dimension validation', () => {
    it('rejects a tag outside the caller vocabulary', async () => {
      await expect(
        service.addPlanTag(humanCaller, planId, 'not-a-known-tag'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(planTagsRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a non-kebab-case tag before any lookup', async () => {
      await expect(
        service.addPlanTag(humanCaller, planId, 'Not Valid'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(skillTagsRepository.listForUser).not.toHaveBeenCalled();
    });

    it('falls back to the committed default vocabulary for a service account with zero rows', async () => {
      skillTagsRepository.findBy.mockResolvedValue([]);

      await service.addPlanTag(agentCaller, planId, 'breakdown');

      expect(planTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ dimension: 'phase', tag: 'breakdown' }),
      );
      expect(skillTagsRepository.listForUser).not.toHaveBeenCalled();
    });
  });

  describe('platform system tags', () => {
    it('accepts follow-up from a service account outside its vocabulary', async () => {
      await service.addPlanTag(agentCaller, planId, 'follow-up');

      expect(planTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ dimension: 'domain', tag: 'follow-up' }),
      );
      expect(skillTagsRepository.findBy).not.toHaveBeenCalled();
    });

    it('accepts follow-up from a user without seeding their vocabulary', async () => {
      await service.addPlanTag(humanCaller, planId, 'follow-up');

      expect(planTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'human', tag: 'follow-up' }),
      );
      expect(skillTagsRepository.listForUser).not.toHaveBeenCalled();
    });
  });

  describe('≤1 phase tag per plan (replace/reject semantics)', () => {
    it('replaces an equal-or-lower-provenance phase tag', async () => {
      const existingPhase = planTagRow('design', 'server-llm');
      planTagsRepository.findByPlanAndDimension.mockResolvedValue(
        existingPhase,
      );

      await service.addPlanTag(taggingCaller, planId, 'breakdown');

      expect(planTagsRepository.remove).toHaveBeenCalledWith(existingPhase.id);
      expect(planTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ dimension: 'phase', tag: 'breakdown' }),
      );
    });

    it('rejects replacing a higher-provenance phase tag with a ladder explanation', async () => {
      planTagsRepository.findByPlanAndDimension.mockResolvedValue(
        planTagRow('design', 'human'),
      );

      await expect(
        service.addPlanTag(taggingCaller, planId, 'breakdown'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(planTagsRepository.remove).not.toHaveBeenCalled();
      expect(planTagsRepository.create).not.toHaveBeenCalled();
    });

    it('re-adding the same phase tag is idempotent (no displacement)', async () => {
      const existingPhase = planTagRow('breakdown', 'human');
      planTagsRepository.findByPlanAndDimension.mockResolvedValue(
        existingPhase,
      );
      planTagsRepository.findByPlanAndTag.mockResolvedValue(existingPhase);

      const result = await service.addPlanTag(humanCaller, planId, 'breakdown');

      expect(result).toBe(existingPhase);
      expect(planTagsRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('same-tag adds (idempotent upsert)', () => {
    it('upgrades the source when the caller outranks the existing row', async () => {
      const existing = planTagRow('backend', 'server-llm');
      planTagsRepository.findByPlanAndTag.mockResolvedValue(existing);

      await service.addPlanTag(humanCaller, planId, 'backend');

      expect(planTagsRepository.update).toHaveBeenCalledWith(existing.id, {
        confidence: null,
        source: 'human',
      });
    });

    it('is a no-op when the caller does not outrank the existing row', async () => {
      const existing = planTagRow('backend', 'human');
      planTagsRepository.findByPlanAndTag.mockResolvedValue(existing);

      const result = await service.addPlanTag(agentCaller, planId, 'backend');

      expect(result).toBe(existing);
      expect(planTagsRepository.update).not.toHaveBeenCalled();
    });

    it('returns the concurrent winner when the insert loses a unique race', async () => {
      const winner = planTagRow('backend', 'human');
      planTagsRepository.findByPlanAndTag
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner);
      planTagsRepository.create.mockRejectedValue(queryFailed('23505'));

      await expect(
        service.addPlanTag(humanCaller, planId, 'backend'),
      ).resolves.toBe(winner);
    });
  });

  describe('missing parents', () => {
    it('reports a missing plan as not found', async () => {
      planTagsRepository.create.mockRejectedValue(queryFailed('23503'));

      await expect(
        service.addPlanTag(humanCaller, planId, 'backend'),
      ).rejects.toThrow(`Plan "${planId}" not found.`);
    });

    it('reports a missing task as not found', async () => {
      taskTagsRepository.create.mockRejectedValue(queryFailed('23503'));

      await expect(
        service.addTaskTag(humanCaller, taskId, 'backend'),
      ).rejects.toThrow(`Task "${taskId}" not found.`);
    });
  });

  describe('removal ladder', () => {
    it('rejects an agent removing a human row', async () => {
      planTagsRepository.findByPlanAndTag.mockResolvedValue(
        planTagRow('backend', 'human'),
      );

      await expect(
        service.removePlanTag(agentCaller, planId, 'backend'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(planTagsRepository.remove).not.toHaveBeenCalled();
    });

    it('rejects server-llm removing an agent row', async () => {
      taskTagsRepository.findByTaskAndTag.mockResolvedValue(
        taskTagRow('backend', 'agent'),
      );

      await expect(
        service.removeTaskTag(taggingCaller, taskId, 'backend'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows server-llm to remove its own row', async () => {
      const row = planTagRow('backend', 'server-llm');
      planTagsRepository.findByPlanAndTag.mockResolvedValue(row);

      await expect(
        service.removePlanTag(taggingCaller, planId, 'backend'),
      ).resolves.toBe(true);
      expect(planTagsRepository.remove).toHaveBeenCalledWith(row.id);
    });

    it('allows a human to remove anything', async () => {
      taskTagsRepository.findByTaskAndTag.mockResolvedValue(
        taskTagRow('backend', 'agent'),
      );

      await expect(
        service.removeTaskTag(humanCaller, taskId, 'backend'),
      ).resolves.toBe(true);
    });

    it('returns false when the tag is absent', async () => {
      await expect(
        service.removePlanTag(humanCaller, planId, 'backend'),
      ).resolves.toBe(false);
    });
  });

  describe('project tags (multi-tag, no phase constraint)', () => {
    it('stores source=human for a user caller', async () => {
      await service.addProjectTag(humanCaller, projectId, 'backend');

      expect(projectTagsRepository.create).toHaveBeenCalledWith({
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
      expect(projectTagsRepository.create).not.toHaveBeenCalled();
    });

    it('allows multiple phase tags (no ≤1-phase displacement)', async () => {
      await service.addProjectTag(humanCaller, projectId, 'design');

      expect(projectTagsRepository.remove).not.toHaveBeenCalled();
      expect(projectTagsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ dimension: 'phase', tag: 'design' }),
      );
    });

    it('upgrades the source on same-tag add when the caller outranks', async () => {
      const existing = projectTagRow('backend', 'server-llm');
      projectTagsRepository.findByProjectAndTag.mockResolvedValue(existing);

      await service.addProjectTag(humanCaller, projectId, 'backend');

      expect(projectTagsRepository.update).toHaveBeenCalledWith(existing.id, {
        confidence: null,
        source: 'human',
      });
    });

    it('removal honors the provenance ladder (agent cannot remove human)', async () => {
      projectTagsRepository.findByProjectAndTag.mockResolvedValue(
        projectTagRow('backend', 'human'),
      );

      await expect(
        service.removeProjectTag(agentCaller, projectId, 'backend'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(projectTagsRepository.remove).not.toHaveBeenCalled();
    });

    it('returns false when removing an absent tag', async () => {
      await expect(
        service.removeProjectTag(humanCaller, projectId, 'backend'),
      ).resolves.toBe(false);
    });
  });

  describe('getEffectiveTagSet', () => {
    it('unions plan and task tags, deduped with highest provenance winning', async () => {
      planTagsRepository.listByPlanId.mockResolvedValue([
        planTagRow('backend', 'server-llm'),
        planTagRow('breakdown', 'human'),
      ]);
      taskTagsRepository.listForPlan.mockResolvedValue([
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
      planTagsRepository.listByPlanId.mockResolvedValue([
        planTagRow('backend', 'human'),
      ]);
      projectTagsRepository.listForPlanProject.mockResolvedValue([
        projectTagRow('github', 'human'),
      ]);

      const result = await service.getEffectiveTagSet(planId);

      expect(result).toEqual([
        expect.objectContaining({ source: 'human', tag: 'backend' }),
        expect.objectContaining({ source: 'human', tag: 'github' }),
      ]);
    });

    it('scopes task tags to the given task in task context', async () => {
      await service.getEffectiveTagSet(planId, taskId);

      expect(taskTagsRepository.listForPlan).toHaveBeenCalledWith(
        planId,
        taskId,
      );
    });
  });
});
