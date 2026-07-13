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
  Plan,
  PlansService,
  ProjectSkillsService,
  ProjectsService,
  SkillAvailabilityService,
  SkillTagsService,
  TagActionRule,
  TagActionRulesService,
  TagsService,
  Task,
  TasksService,
  User,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { PlanContextAvailabilityService } from './plan-context-availability.service';

const planId = '00000000-0000-4000-8000-000000000001';
const projectId = '00000000-0000-4000-8000-000000000002';
const taskId = '00000000-0000-4000-8000-000000000003';
const ownerId = '00000000-0000-4000-8000-000000000004';
const callerId = '00000000-0000-4000-8000-000000000005';

const vocabularyRows = ['backend', 'breakdown', 'github', 'terraform'].map(
  (tag) => asMock({ dimension: tag === 'breakdown' ? 'phase' : 'domain', tag }),
);

const availabilityExceptionRule = (
  payload: Record<string, unknown>,
): TagActionRule =>
  asMock<TagActionRule>({
    actionPayload: payload,
    actionType: 'availability-exception',
    enabled: true,
    environment: null,
    id: 'exception-rule-1',
    projectId: null,
    status: null,
    tagAll: ['breakdown'],
    userId: ownerId,
  });

describe('PlanContextAvailabilityService', () => {
  let service: PlanContextAvailabilityService;
  let planFindOne: ReturnType<typeof vi.fn>;
  let taskFindOne: ReturnType<typeof vi.fn>;
  let effectiveTagSet: Mock<TagsService['getEffectiveTagSet']>;
  let listEnabledForUser: Mock<TagActionRulesService['listEnabledForUser']>;
  let getRuleSetForProject: Mock<
    SkillAvailabilityService['getRuleSetForProject']
  >;
  let getSkillsForProject: Mock<ProjectSkillsService['getSkillsForProject']>;

  beforeEach(() => {
    vi.clearAllMocks();

    planFindOne = vi.fn().mockResolvedValue(
      asMock<Plan>({
        author: 'owner-gh',
        id: planId,
        projectId,
        status: 'PENDING',
      }),
    );
    taskFindOne = vi
      .fn()
      .mockResolvedValue(asMock<Task>({ id: taskId, planId }));
    effectiveTagSet = vi.fn().mockResolvedValue([
      {
        confidence: null,
        dimension: 'phase',
        source: 'agent',
        tag: 'breakdown',
      },
      { confidence: null, dimension: 'domain', source: 'agent', tag: 'github' },
    ]);
    listEnabledForUser = vi.fn().mockResolvedValue([]);
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

    service = new PlanContextAvailabilityService(
      createMock<LoggerService>(),
      createMock<PlansService>({
        getRepository: vi.fn(() => asMock({ findOne: planFindOne })),
      }),
      createMock<ProjectSkillsService>({ getSkillsForProject }),
      createMock<ProjectsService>({
        findByNxProjectName: vi.fn().mockResolvedValue(null),
      }),
      createMock<SkillAvailabilityService>({ getRuleSetForProject }),
      createMock<SkillTagsService>({
        listForUser: vi.fn().mockResolvedValue(vocabularyRows),
      }),
      createMock<TagActionRulesService>({ listEnabledForUser }),
      createMock<TagsService>({ getEffectiveTagSet: effectiveTagSet }),
      createMock<TasksService>({
        getRepository: vi.fn(() => asMock({ findOne: taskFindOne })),
      }),
      createMock<UsersService>({
        findByGithubUsername: vi
          .fn()
          .mockResolvedValue(asMock<User>({ id: ownerId })),
      }),
    );
  });

  it('rejects a taskId that does not belong to the plan', async () => {
    taskFindOne.mockResolvedValue(
      asMock<Task>({ id: taskId, planId: 'another-plan' }),
    );

    await expect(
      service.resolveForPlan({ planId, taskId, vocabularyUserId: callerId }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws NotFound for a missing plan', async () => {
    planFindOne.mockResolvedValue(null);

    await expect(
      service.resolveForPlan({ planId, vocabularyUserId: callerId }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('is annotation-only without matched exception rules: effective flags equal pure passthrough', async () => {
    const result = await service.resolveForPlan({
      planId,
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
      vocabularyUserId: callerId,
    });

    const grilling = result.skills.find((skill) => skill.slug === 'grilling');
    expect(grilling?.effectiveDisableModelInvocation).toBe(true);
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
        status: null,
        tagAll: ['terraform'],
        userId: ownerId,
      }),
    ]);

    const result = await service.resolveForPlan({
      planId,
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
});
