import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import {
  PlansRepository,
  RolesRepository,
  RuleApplicationsRepository,
  TagActionRulesRepository,
  UsersRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  createRolesRepositoryMock,
  createRuleApplicationsRepositoryMock,
  createTagActionRulesRepositoryMock,
  createUsersRepositoryMock,
  plansFactory,
  ruleApplicationsFactory,
  type RuleApplicationsRepositoryMock,
  tagActionRulesFactory,
  type TagActionRulesRepositoryMock,
  usersFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { TAG_ACTION_TYPES } from '@openthrottle/openthrottle-skills';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { TagActionRulePreviewService } from '../../services/tag-action-rule-preview/tag-action-rule-preview.service.ts';
import { TagActionRulesService } from '../../services/tag-action-rules/tag-action-rules.service.ts';
import { TagsService } from '../../services/tags/tags.service.ts';
import { TagActionRulesResolver } from './tag-action-rules.resolver.ts';

const userId = '22222222-2222-4222-8222-222222222222';
const human: AuthPrincipal = { kind: AUTH_PRINCIPAL_KIND_USER, sub: userId };

describe('TagActionRulesResolver', () => {
  let applications: RuleApplicationsRepositoryMock;
  let plans: ReturnType<typeof createPlansRepositoryMock>;
  let repository: TagActionRulesRepositoryMock;
  let resolver: TagActionRulesResolver;

  const tagNamesForPlans = vi.fn();
  const users = createUsersRepositoryMock();

  beforeEach(async () => {
    vi.clearAllMocks();
    tagNamesForPlans.mockResolvedValue(new Map());
    users.findOne.mockResolvedValue(
      usersFactory.build({ githubUsername: 'octocat', id: userId }),
    );
    applications = createRuleApplicationsRepositoryMock();
    plans = createPlansRepositoryMock();
    repository = createTagActionRulesRepositoryMock();
    const app = await Test.createTestingModule({
      providers: [
        GqlPermissionsGuard,
        TagActionRulesResolver,
        TagActionRulePreviewService,
        TagActionRulesService,
        { provide: PlansRepository, useValue: plans },
        {
          provide: TagsService,
          useValue: { getEffectiveTagNamesForPlans: tagNamesForPlans },
        },
        {
          provide: UsersRepository,
          useValue: users,
        },
        { provide: RolesRepository, useValue: createRolesRepositoryMock() },
        {
          provide: RuleApplicationsRepository,
          useValue: applications,
        },
        { provide: TagActionRulesRepository, useValue: repository },
      ],
    }).compile();
    resolver = app.get(TagActionRulesResolver);
  });

  describe('upsertTagActionRule', () => {
    it('persists a promote-task-to-plan rule', async () => {
      // fishery deep-merges params, so an empty payload object would keep the
      // factory's default; the stored payload is asserted on create below.
      const created = tagActionRulesFactory.build({
        actionType: TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN,
        tagAll: ['spike'],
        title: 'Promote spikes',
        userId,
      });
      repository.create.mockResolvedValue(created);

      const result = await resolver.upsertTagActionRule(human, {
        actionPayloadJson: '{}',
        actionType: TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN,
        tagAll: ['spike'],
        title: 'Promote spikes',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actionPayload: {},
          actionType: TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN,
          tagAll: ['spike'],
          userId,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          actionType: TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN,
          id: created.id,
        }),
      );
    });

    it('rejects a promote-task-to-plan payload carrying options', async () => {
      await expect(
        resolver.upsertTagActionRule(human, {
          actionPayloadJson: '{"statusFilter":"PENDING"}',
          actionType: TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN,
          title: 'Promote spikes',
        }),
      ).rejects.toThrow(/Invalid promote-task-to-plan payload/);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('rejects a payload that is not JSON', async () => {
      await expect(
        resolver.upsertTagActionRule(human, {
          actionPayloadJson: '{',
          actionType: TAG_ACTION_TYPES.PROMOTE_TASK_TO_PLAN,
          title: 'Promote spikes',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ruleApplicationsForRule', () => {
    it('lists the ledger of the callers own rule with the plan title', async () => {
      const rule = tagActionRulesFactory.build({ userId });
      repository.findForUser.mockResolvedValue(rule);
      const row = ruleApplicationsFactory.build({ ruleId: rule.id });
      applications.listForRule.mockResolvedValue([
        { ...row, plan: plansFactory.build({ title: 'Plan one' }) },
      ]);

      const result = await resolver.ruleApplicationsForRule(human, rule.id);

      expect(repository.findForUser).toHaveBeenCalledWith(userId, rule.id);
      expect(applications.listForRule).toHaveBeenCalledWith(rule.id);
      expect(result).toEqual([
        expect.objectContaining({ id: row.id, planTitle: 'Plan one' }),
      ]);
    });

    it('returns an empty list without reading the ledger for a rule the caller does not own', async () => {
      repository.findForUser.mockResolvedValue(null);

      const result = await resolver.ruleApplicationsForRule(human, 'other');

      expect(result).toEqual([]);
      expect(applications.listForRule).not.toHaveBeenCalled();
    });

    it('rejects a service account caller', async () => {
      await expect(
        resolver.ruleApplicationsForRule(
          { kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT, sub: 'sa' },
          'r',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('previewTagActionRule', () => {
    const input = {
      actionPayloadJson: '{',
      actionType: TAG_ACTION_TYPES.INJECT_TASK,
      repositoryId: 'repo-1',
      title: '',
    };

    it('previews with an incomplete payload and title, writing and dispatching nothing', async () => {
      const hit = plansFactory.build({ repositoryId: 'repo-1' });
      const miss = plansFactory.build({ repositoryId: null });
      plans.listRecentForAuthor.mockResolvedValue([hit, miss]);

      const result = await resolver.previewTagActionRule(human, input);

      expect(result.matched).toEqual([expect.objectContaining({ id: hit.id })]);
      expect(result.nonMatching[0]).toEqual(
        expect.objectContaining({
          conditions: expect.arrayContaining([
            expect.objectContaining({
              condition: 'repository',
              passed: false,
            }),
          ]),
          id: miss.id,
        }),
      );
      expect(applications.record).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('evaluates against the optional environment', async () => {
      plans.listRecentForAuthor.mockResolvedValue([plansFactory.build()]);

      const result = await resolver.previewTagActionRule(
        human,
        { ...input, environment: 'ci', repositoryId: null },
        'ci',
      );

      expect(result.environment).toBe('ci');
      expect(result.matchedCount).toBe(1);
    });

    it('rejects an unknown action type', async () => {
      await expect(
        resolver.previewTagActionRule(human, {
          ...input,
          actionType: 'nope',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a service account caller', async () => {
      await expect(
        resolver.previewTagActionRule(
          { kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT, sub: 'sa' },
          input,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
