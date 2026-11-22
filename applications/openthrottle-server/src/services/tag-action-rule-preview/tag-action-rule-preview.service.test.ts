import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PlansRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  PlansRepositoryMock,
  UsersRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPlansRepositoryMock,
  createUsersRepositoryMock,
  plansFactory,
  usersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { TAG_ACTION_TYPES } from '@openthrottle/openthrottle-skills';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TagsService } from '../tags/tags.service.ts';
import {
  TAG_ACTION_RULE_PREVIEW_NON_MATCH_SAMPLE_SIZE,
  TAG_ACTION_RULE_PREVIEW_PLAN_CAP,
} from './tag-action-rule-preview.constants.ts';
import { TagActionRulePreviewService } from './tag-action-rule-preview.service.ts';
import type { TagActionRulePreviewRule } from './tag-action-rule-preview.types.ts';

const userId = '22222222-2222-4222-8222-222222222222';

const rule = (
  overrides: Partial<TagActionRulePreviewRule> = {},
): TagActionRulePreviewRule => {
  return {
    actionType: TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN,
    environment: null,
    projectId: null,
    repositoryId: null,
    status: null,
    tagAll: [],
    ...overrides,
  };
};

describe('TagActionRulePreviewService', () => {
  let plans: PlansRepositoryMock;
  let service: TagActionRulePreviewService;
  let tagNames: Map<string, string[]>;
  let users: UsersRepositoryMock;
  const getEffectiveTagNamesForPlans = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    plans = createPlansRepositoryMock();
    users = createUsersRepositoryMock();
    tagNames = new Map();
    getEffectiveTagNamesForPlans.mockImplementation(async () => {
      return tagNames;
    });
    users.findOne.mockResolvedValue(
      usersFactory.build({ githubUsername: 'octocat', id: userId }),
    );

    const app = await Test.createTestingModule({
      providers: [
        TagActionRulePreviewService,
        { provide: PlansRepository, useValue: plans },
        { provide: TagsService, useValue: { getEffectiveTagNamesForPlans } },
        { provide: UsersRepository, useValue: users },
      ],
    }).compile();
    service = app.get(TagActionRulePreviewService);
  });

  describe('owner scoping', () => {
    it("loads only plans authored by the caller's GitHub username", async () => {
      await service.preview(userId, rule(), null);

      expect(plans.listRecentForAuthor).toHaveBeenCalledWith(
        'octocat',
        TAG_ACTION_RULE_PREVIEW_PLAN_CAP + 1,
      );
    });

    it('returns an empty preview without loading plans when the caller has no user row', async () => {
      users.findOne.mockResolvedValue(null);

      const result = await service.preview(userId, rule(), null);

      expect(result.evaluated).toBe(0);
      expect(plans.listRecentForAuthor).not.toHaveBeenCalled();
    });
  });

  describe('matching', () => {
    it('splits plans into matched and a non-matching sample with the reason', async () => {
      const hit = plansFactory.build({
        repositoryId: 'repo-1',
        status: 'PENDING',
      });
      const noRepository = plansFactory.build({
        repositoryId: null,
        status: 'PENDING',
      });
      plans.listRecentForAuthor.mockResolvedValue([hit, noRepository]);
      tagNames.set(hit.id, ['spike']);
      tagNames.set(noRepository.id, ['spike']);

      const result = await service.preview(
        userId,
        rule({ repositoryId: 'repo-1', tagAll: ['spike'] }),
        null,
      );

      expect(result.matched.map((plan) => plan.id)).toEqual([hit.id]);
      expect(result.matchedCount).toBe(1);
      expect(result.evaluated).toBe(2);
      expect(result.specificity).toBe(3);
      expect(result.nonMatching).toEqual([
        expect.objectContaining({
          explanation: expect.objectContaining({ matched: false }),
          id: noRepository.id,
        }),
      ]);
    });

    it('scores and matches a project scope, explaining the project condition on a miss', async () => {
      const inProject = plansFactory.build({ projectId: 'project-1' });
      const elsewhere = plansFactory.build({ projectId: 'project-2' });
      plans.listRecentForAuthor.mockResolvedValue([inProject, elsewhere]);

      const result = await service.preview(
        userId,
        rule({ projectId: 'project-1' }),
        null,
      );

      expect(result.specificity).toBe(2);
      expect(result.matched).toEqual([
        expect.objectContaining({ id: inProject.id, projectId: 'project-1' }),
      ]);
      expect(result.nonMatching[0]?.projectId).toBe('project-2');
      expect(result.nonMatching[0]?.explanation.conditions).toContainEqual({
        actual: 'project-2',
        condition: 'project',
        expected: 'project-1',
        passed: false,
      });
    });

    it('flags an environment-only miss and matches once an environment is supplied', async () => {
      const plan = plansFactory.build();
      plans.listRecentForAuthor.mockResolvedValue([plan]);

      const none = await service.preview(
        userId,
        rule({ environment: 'ci' }),
        null,
      );
      const ci = await service.preview(
        userId,
        rule({ environment: 'ci' }),
        'ci',
      );

      expect(none.matchedCount).toBe(0);
      expect(none.nonMatching[0]?.explanation.failedOnlyOnEnvironment).toBe(
        true,
      );
      expect(ci.matchedCount).toBe(1);
      expect(ci.environment).toBe('ci');
    });

    it('rejects an unknown evaluation environment', async () => {
      await expect(service.preview(userId, rule(), 'staging')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cap and sample', () => {
    it('evaluates only the cap and says it truncated', async () => {
      plans.listRecentForAuthor.mockResolvedValue(
        plansFactory.buildList(TAG_ACTION_RULE_PREVIEW_PLAN_CAP + 1),
      );

      const result = await service.preview(userId, rule(), null);

      expect(result.truncated).toBe(true);
      expect(result.evaluated).toBe(TAG_ACTION_RULE_PREVIEW_PLAN_CAP);
      expect(result.cap).toBe(TAG_ACTION_RULE_PREVIEW_PLAN_CAP);
    });

    it('is not truncated at exactly the cap', async () => {
      plans.listRecentForAuthor.mockResolvedValue(
        plansFactory.buildList(TAG_ACTION_RULE_PREVIEW_PLAN_CAP),
      );

      const result = await service.preview(userId, rule(), null);

      expect(result.truncated).toBe(false);
    });

    it('limits the non-matching sample', async () => {
      plans.listRecentForAuthor.mockResolvedValue(
        plansFactory.buildList(
          TAG_ACTION_RULE_PREVIEW_NON_MATCH_SAMPLE_SIZE + 5,
          { status: 'COMPLETED' },
        ),
      );

      const result = await service.preview(
        userId,
        rule({ status: 'PENDING' }),
        null,
      );

      expect(result.nonMatching).toHaveLength(
        TAG_ACTION_RULE_PREVIEW_NON_MATCH_SAMPLE_SIZE,
      );
      expect(result.matchedCount).toBe(0);
    });

    it('batches the tag lookup into one call', async () => {
      plans.listRecentForAuthor.mockResolvedValue(plansFactory.buildList(3));

      await service.preview(userId, rule(), null);

      expect(getEffectiveTagNamesForPlans).toHaveBeenCalledTimes(1);
    });
  });
});
