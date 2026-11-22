/**
 * @description Unit tests for {@link PlanContextAvailabilityService}: the
 * shipped resolver runs unchanged (annotation-only when no exception rule
 * matches), ephemeral availability-exception rules compose through the
 * deny-wins ladder, taskId-in-plan validation, matchedPlanTags/planRelevant
 * annotation, and the inject-task gate semantics.
 */

import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  CustomPrompt,
  CustomPromptsRepository,
  Plan,
  PlansRepository,
  ProjectsRepository,
  RuleApplication,
  RuleApplicationsRepository,
  SkillTagsRepository,
  TagActionRule,
  TagActionRulesRepository,
  Task,
  TasksRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  CustomPromptsRepositoryMock,
  PlansRepositoryMock,
  RuleApplicationsRepositoryMock,
  TagActionRulesRepositoryMock,
  TasksRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createCustomPromptsRepositoryMock,
  createPlansRepositoryMock,
  createProjectsRepositoryMock,
  createRuleApplicationsRepositoryMock,
  createSkillTagsRepositoryMock,
  createTagActionRulesRepositoryMock,
  createTasksRepositoryMock,
  createUsersRepositoryMock,
  usersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProjectSkillsService } from '../project-skills/project-skills.service.ts';
import type { SkillAvailabilityService } from '../skill-availability/skill-availability.service.ts';
import type { TagsService } from '../tags/tags.service.ts';
import { PlanContextAvailabilityService } from './plan-context-availability.service.ts';

const planId = '00000000-0000-4000-8000-000000000001';
const projectId = '00000000-0000-4000-8000-000000000002';
const taskId = '00000000-0000-4000-8000-000000000003';
const ownerId = '00000000-0000-4000-8000-000000000004';
const callerId = '00000000-0000-4000-8000-000000000005';

const vocabularyTags = ['backend', 'breakdown', 'github', 'terraform'];

const availabilityExceptionRule = (
  payload: Record<string, unknown>,
): TagActionRule => {
  return asMock<TagActionRule>({
    actionPayload: payload,
    actionType: 'availability-exception',
    enabled: true,
    environment: null,
    id: 'exception-rule-1',
    projectId: null,
    repositoryId: null,
    status: null,
    tagAll: ['breakdown'],
    userId: ownerId,
  });
};

const attachRow = (
  id: string,
  details: Record<string, unknown>,
  ruleEnvironment: string | null = null,
): RuleApplication => {
  return asMock<RuleApplication>({
    details,
    id,
    rule: asMock<TagActionRule>({ environment: ruleEnvironment }),
    ruleId: `rule-${id}`,
    state: 'applied',
  });
};

const livePrompt = (
  id: string,
  promptType: 'personas' | 'prompts' = 'prompts',
): CustomPrompt => {
  return asMock<CustomPrompt>({
    content: `content of ${id}`,
    filePath: `.agents/prompts/${id}.md`,
    id,
    promptType,
    title: `Title ${id}`,
  });
};

describe('PlanContextAvailabilityService', () => {
  let service: PlanContextAvailabilityService;
  let customPromptsRepository: CustomPromptsRepositoryMock;
  let ruleApplicationsRepository: RuleApplicationsRepositoryMock;
  let planFindOne: PlansRepositoryMock['findOne'];
  let taskFindOne: TasksRepositoryMock['findOne'];
  let effectiveTagSet: Mock<TagsService['getEffectiveTagSet']>;
  let listEnabledForUser: TagActionRulesRepositoryMock['listEnabledForUser'];
  let getRuleSetForProject: Mock<
    SkillAvailabilityService['getRuleSetForProject']
  >;
  let getSkillsForProject: Mock<ProjectSkillsService['getSkillsForProject']>;

  beforeEach(() => {
    vi.clearAllMocks();

    const plansRepository = createPlansRepositoryMock();
    const tasksRepository = createTasksRepositoryMock();
    const usersRepository = createUsersRepositoryMock();
    const skillTagsRepository = createSkillTagsRepositoryMock();
    skillTagsRepository.listVocabularyTags.mockResolvedValue(vocabularyTags);
    usersRepository.findByGithubUsername.mockResolvedValue(
      usersFactory.build({ id: ownerId }),
    );

    planFindOne = plansRepository.findOne;
    planFindOne.mockResolvedValue(
      asMock<Plan>({
        author: 'owner-gh',
        id: planId,
        projectId,
        status: 'PENDING',
      }),
    );
    taskFindOne = tasksRepository.findOne;
    taskFindOne.mockResolvedValue(asMock<Task>({ id: taskId, planId }));
    effectiveTagSet = vi.fn().mockResolvedValue([
      {
        confidence: null,
        dimension: 'phase',
        source: 'agent',
        tag: 'breakdown',
      },
      { confidence: null, dimension: 'domain', source: 'agent', tag: 'github' },
    ]);
    const tagActionRulesRepository = createTagActionRulesRepositoryMock();
    listEnabledForUser = tagActionRulesRepository.listEnabledForUser;
    getRuleSetForProject = vi.fn().mockResolvedValue(undefined);
    getSkillsForProject = vi.fn().mockResolvedValue([
      {
        slug: 'grilling',
        staticDisableModelInvocation: null,
        tags: ['github', 'planning'],
      },
      {
        slug: 'terraform-deploy',
        staticDisableModelInvocation: null,
        tags: ['terraform'],
      },
    ]);

    customPromptsRepository = createCustomPromptsRepositoryMock();
    ruleApplicationsRepository = createRuleApplicationsRepositoryMock();

    service = new PlanContextAvailabilityService(
      asMock<CustomPromptsRepository>(customPromptsRepository),
      createMock<LoggerService>(),
      asMock<PlansRepository>(plansRepository),
      createMock<ProjectSkillsService>({ getSkillsForProject }),
      asMock<ProjectsRepository>(createProjectsRepositoryMock()),
      asMock<RuleApplicationsRepository>(ruleApplicationsRepository),
      createMock<SkillAvailabilityService>({ getRuleSetForProject }),
      asMock<SkillTagsRepository>(skillTagsRepository),
      asMock<TagActionRulesRepository>(tagActionRulesRepository),
      createMock<TagsService>({ getEffectiveTagSet: effectiveTagSet }),
      asMock<TasksRepository>(tasksRepository),
      createMock<UsersRepository>(usersRepository),
    );
  });

  it('rejects a taskId that does not belong to the plan', async () => {
    taskFindOne.mockResolvedValue(
      asMock<Task>({ id: taskId, planId: 'another-plan' }),
    );

    await expect(
      service.resolveForPlan({
        planId,
        taskId,
        vocabularySeedDefaults: true,
        vocabularyUserId: callerId,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFound for a missing plan', async () => {
    planFindOne.mockResolvedValue(null);

    await expect(
      service.resolveForPlan({
        planId,
        vocabularySeedDefaults: true,
        vocabularyUserId: callerId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('is annotation-only without matched exception rules: effective flags equal pure passthrough', async () => {
    const result = await service.resolveForPlan({
      planId,
      vocabularySeedDefaults: true,
      vocabularyUserId: callerId,
    });

    expect(
      result.skills.map((skill) => skill.effectiveDisableModelInvocation),
    ).toEqual([false, false]);
    expect(result.skills[0]?.provenance).toContain('frontmatter:unset');
  });

  it('annotates matchedPlanTags (domain intersection) and planRelevant, with provenance suffixes', async () => {
    const result = await service.resolveForPlan({
      planId,
      vocabularySeedDefaults: true,
      vocabularyUserId: callerId,
    });

    const grilling = result.skills.find((skill) => skill.slug === 'grilling');
    const terraform = result.skills.find(
      (skill) => skill.slug === 'terraform-deploy',
    );
    expect(grilling).toMatchObject({
      matchedPlanTags: ['github'],
      planRelevant: true,
    });
    expect(grilling?.provenance).toContain('plan-context: matched [github]');
    expect(terraform).toMatchObject({
      matchedPlanTags: [],
      planRelevant: false,
    });
    expect(terraform?.provenance).toContain('plan-context: no tag overlap');
  });

  it('the phase tag (breakdown) never appears in matchedPlanTags or the effective domain set', async () => {
    const result = await service.resolveForPlan({
      planId,
      vocabularySeedDefaults: true,
      vocabularyUserId: callerId,
    });

    expect(result.effectiveDomainTags).toEqual(['github']);
  });

  it('materializes matched availability-exception rules ephemerally (tag-deny suppresses)', async () => {
    listEnabledForUser.mockResolvedValue([
      availabilityExceptionRule({ tagDeny: ['github'] }),
    ]);

    const result = await service.resolveForPlan({
      planId,
      vocabularySeedDefaults: true,
      vocabularyUserId: callerId,
    });

    const grilling = result.skills.find((skill) => skill.slug === 'grilling');
    expect(grilling?.effectiveDisableModelInvocation).toBe(true);
    expect(grilling?.provenance).toContain('plan-context');
  });

  it('ephemeral exception rules compose through deny-wins: allow+deny the same tag denies', async () => {
    listEnabledForUser.mockResolvedValue([
      availabilityExceptionRule({ tagAllow: ['github'], tagDeny: ['github'] }),
    ]);

    const result = await service.resolveForPlan({
      planId,
      vocabularySeedDefaults: true,
      vocabularyUserId: callerId,
    });

    const grilling = result.skills.find((skill) => skill.slug === 'grilling');
    expect(grilling?.effectiveDisableModelInvocation).toBe(true);
  });

  describe('specificity layering', () => {
    const repositoryId = '00000000-0000-4000-8000-000000000009';

    const scopedRule = (
      id: string,
      scopedRepositoryId: string | null,
      payload: Record<string, unknown>,
    ): TagActionRule => {
      return asMock<TagActionRule>({
        ...availabilityExceptionRule(payload),
        createdAt: new Date('2026-01-01T00:00:00Z'),
        id,
        repositoryId: scopedRepositoryId,
      });
    };

    beforeEach(() => {
      planFindOne.mockResolvedValue(
        asMock<Plan>({
          author: 'owner-gh',
          id: planId,
          projectId,
          repositoryId,
          status: 'PENDING',
        }),
      );
    });

    it('a repository-scoped allow beats a global deny for the same slug', async () => {
      listEnabledForUser.mockResolvedValue([
        scopedRule('global-rule', null, { slugDeny: ['grilling'] }),
        scopedRule('repo-rule', repositoryId, { slugAllow: ['grilling'] }),
      ]);

      const result = await service.resolveForPlan({
        planId,
        vocabularySeedDefaults: true,
        vocabularyUserId: callerId,
      });

      const grilling = result.skills.find((skill) => skill.slug === 'grilling');
      expect(grilling?.effectiveDisableModelInvocation).toBe(false);
      expect(grilling?.provenance).toContain('rule:repo-rule');
    });

    it('a repository-scoped deny beats a global allow for the same tag', async () => {
      listEnabledForUser.mockResolvedValue([
        scopedRule('global-rule', null, { tagAllow: ['github'] }),
        scopedRule('repo-rule', repositoryId, { tagDeny: ['github'] }),
      ]);

      const result = await service.resolveForPlan({
        planId,
        vocabularySeedDefaults: true,
        vocabularyUserId: callerId,
      });

      const grilling = result.skills.find((skill) => skill.slug === 'grilling');
      expect(grilling?.effectiveDisableModelInvocation).toBe(true);
    });

    it('deny still wins between two rules of the same specificity', async () => {
      listEnabledForUser.mockResolvedValue([
        scopedRule('a-rule', null, { slugAllow: ['grilling'] }),
        scopedRule('b-rule', null, { slugDeny: ['grilling'] }),
      ]);

      const result = await service.resolveForPlan({
        planId,
        vocabularySeedDefaults: true,
        vocabularyUserId: callerId,
      });

      const grilling = result.skills.find((skill) => skill.slug === 'grilling');
      expect(grilling?.effectiveDisableModelInvocation).toBe(true);
    });
  });

  it('an unmatched exception rule (tag_all not satisfied) changes nothing', async () => {
    listEnabledForUser.mockResolvedValue([
      asMock<TagActionRule>({
        actionPayload: { tagDeny: ['github'] },
        actionType: 'availability-exception',
        enabled: true,
        environment: null,
        id: 'exception-rule-2',
        projectId: null,
        repositoryId: null,
        status: null,
        tagAll: ['terraform'],
        userId: ownerId,
      }),
    ]);

    const result = await service.resolveForPlan({
      planId,
      vocabularySeedDefaults: true,
      vocabularyUserId: callerId,
    });

    const grilling = result.skills.find((skill) => skill.slug === 'grilling');
    expect(grilling?.effectiveDisableModelInvocation).toBe(false);
  });

  describe('isSkillUnavailableForPlan (inject-task gate)', () => {
    it('gates a slug missing from the plan-context universe', async () => {
      await expect(
        service.isSkillUnavailableForPlan(planId, 'not-a-skill', ownerId),
      ).resolves.toBe(true);
    });

    it('passes an available slug', async () => {
      await expect(
        service.isSkillUnavailableForPlan(planId, 'grilling', ownerId),
      ).resolves.toBe(false);
    });

    it('skips the gate when no project universe is resolvable', async () => {
      planFindOne.mockResolvedValue(
        asMock<Plan>({
          author: 'owner-gh',
          id: planId,
          projectId: null,
          status: 'PENDING',
        }),
      );

      await expect(
        service.isSkillUnavailableForPlan(planId, 'anything', ownerId),
      ).resolves.toBe(false);
    });

    it('gates a slug denied by a matched exception rule', async () => {
      listEnabledForUser.mockResolvedValue([
        availabilityExceptionRule({ slugDeny: ['grilling'] }),
      ]);

      await expect(
        service.isSkillUnavailableForPlan(planId, 'grilling', ownerId),
      ).resolves.toBe(true);
    });
  });

  describe('attached prompts', () => {
    const resolve = (environment?: 'ci' | 'interactive' | 'ralph') => {
      return service.resolveForPlan({
        environment,
        planId,
        vocabularySeedDefaults: true,
        vocabularyUserId: callerId,
      });
    };

    it('composes start prompts first, then end prompts, each in attach order', async () => {
      ruleApplicationsRepository.listAppliedAttachPrompts.mockResolvedValue([
        attachRow('a', {
          placement: 'end',
          promptId: 'p-a',
          promptType: 'prompts',
        }),
        attachRow('b', {
          placement: 'start',
          promptId: 'p-b',
          promptType: 'personas',
        }),
        attachRow('c', {
          placement: 'end',
          promptId: 'p-c',
          promptType: 'prompts',
        }),
        attachRow('d', {
          placement: 'start',
          promptId: 'p-d',
          promptType: 'prompts',
        }),
      ]);
      customPromptsRepository.findVisibleById.mockImplementation(async (id) => {
        return livePrompt(id, id === 'p-b' ? 'personas' : 'prompts');
      });

      const result = await resolve();

      expect(result.attachedPrompts.map((prompt) => prompt.promptId)).toEqual([
        'p-b',
        'p-d',
        'p-a',
        'p-c',
      ]);
      expect(result.attachedPrompts[0]).toEqual({
        content: 'content of p-b',
        filePath: '.agents/prompts/p-b.md',
        placement: 'start',
        promptId: 'p-b',
        promptType: 'personas',
        ruleId: 'rule-b',
        title: 'Title p-b',
      });
    });

    it('re-checks visibility against the plan owner, not the caller', async () => {
      ruleApplicationsRepository.listAppliedAttachPrompts.mockResolvedValue([
        attachRow('a', {
          placement: 'end',
          promptId: 'p-a',
          promptType: 'prompts',
        }),
      ]);

      await resolve();

      expect(customPromptsRepository.findVisibleById).toHaveBeenCalledWith(
        'p-a',
        ownerId,
      );
    });

    it('drops a since-deleted or no-longer-visible prompt', async () => {
      ruleApplicationsRepository.listAppliedAttachPrompts.mockResolvedValue([
        attachRow('gone', {
          placement: 'end',
          promptId: 'p-gone',
          promptType: 'prompts',
        }),
        attachRow('kept', {
          placement: 'end',
          promptId: 'p-kept',
          promptType: 'prompts',
        }),
      ]);
      // The repository answers null for a soft-deleted row and for another user's row alike.
      customPromptsRepository.findVisibleById.mockImplementation(async (id) => {
        return id === 'p-kept' ? livePrompt(id) : null;
      });

      const result = await resolve();

      expect(result.attachedPrompts.map((prompt) => prompt.promptId)).toEqual([
        'p-kept',
      ]);
    });

    it('drops a prompt whose type changed since it was attached', async () => {
      ruleApplicationsRepository.listAppliedAttachPrompts.mockResolvedValue([
        attachRow('a', {
          placement: 'end',
          promptId: 'p-a',
          promptType: 'prompts',
        }),
      ]);
      customPromptsRepository.findVisibleById.mockResolvedValue(
        livePrompt('p-a', 'personas'),
      );

      expect((await resolve()).attachedPrompts).toEqual([]);
    });

    it('drops a row whose details do not parse', async () => {
      ruleApplicationsRepository.listAppliedAttachPrompts.mockResolvedValue([
        attachRow('a', { reason: 'already-attached' }),
      ]);

      expect((await resolve()).attachedPrompts).toEqual([]);
      expect(customPromptsRepository.findVisibleById).not.toHaveBeenCalled();
    });

    it("takes an environment-qualified rule's prompt only on a read in that environment", async () => {
      ruleApplicationsRepository.listAppliedAttachPrompts.mockResolvedValue([
        attachRow(
          'a',
          { placement: 'end', promptId: 'p-a', promptType: 'prompts' },
          'ralph',
        ),
      ]);
      customPromptsRepository.findVisibleById.mockResolvedValue(
        livePrompt('p-a'),
      );

      expect((await resolve('ralph')).attachedPrompts).toHaveLength(1);
      expect((await resolve('ci')).attachedPrompts).toEqual([]);
      expect((await resolve()).attachedPrompts).toEqual([]);
    });

    it('has no attachments when the plan author has no user row', async () => {
      ruleApplicationsRepository.listAppliedAttachPrompts.mockResolvedValue([
        attachRow('a', {
          placement: 'end',
          promptId: 'p-a',
          promptType: 'prompts',
        }),
      ]);
      const usersRepository = createUsersRepositoryMock();
      usersRepository.findByGithubUsername.mockResolvedValue(null);
      service = new PlanContextAvailabilityService(
        asMock<CustomPromptsRepository>(customPromptsRepository),
        createMock<LoggerService>(),
        asMock<PlansRepository>(
          Object.assign(createPlansRepositoryMock(), { findOne: planFindOne }),
        ),
        createMock<ProjectSkillsService>({ getSkillsForProject }),
        asMock<ProjectsRepository>(createProjectsRepositoryMock()),
        asMock<RuleApplicationsRepository>(ruleApplicationsRepository),
        createMock<SkillAvailabilityService>({ getRuleSetForProject }),
        asMock<SkillTagsRepository>(createSkillTagsRepositoryMock()),
        asMock<TagActionRulesRepository>(createTagActionRulesRepositoryMock()),
        createMock<TagsService>({ getEffectiveTagSet: effectiveTagSet }),
        asMock<TasksRepository>(createTasksRepositoryMock()),
        createMock<UsersRepository>(usersRepository),
      );

      expect((await resolve()).attachedPrompts).toEqual([]);
      expect(
        ruleApplicationsRepository.listAppliedAttachPrompts,
      ).not.toHaveBeenCalled();
    });
  });
});
