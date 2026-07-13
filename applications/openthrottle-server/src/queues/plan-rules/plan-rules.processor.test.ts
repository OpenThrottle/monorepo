/**
 * @description Unit tests for {@link PlanRulesProcessor.process}: the shared
 * executor-contract behavior (fingerprint no-op on duplicate delivery, skip
 * without ledger row when no executor is registered, orphan flip on un-match)
 * and dispatch wiring.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  PlansService,
  RuleApplication,
  RuleApplicationsService,
  TagActionRule,
  TagActionRulesService,
  TagsService,
  User,
  UsersService,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionExecutorRegistry, type ActionExecutor } from './action-executor';
import { PlanRulesProcessor } from './plan-rules.processor';
import type { PlanRulesEvaluateJob } from './plan-rules.types';

const planId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';

const buildJob = (): PlanRulesEvaluateJob =>
  asMock<PlanRulesEvaluateJob>({
    data: { planId, triggerKind: 'tag-changed' },
  });

const buildPlan = (): Plan =>
  asMock<Plan>({
    author: 'visormatt',
    id: planId,
    projectId: null,
    status: 'PENDING',
  });

const buildRule = (overrides: Partial<TagActionRule> = {}): TagActionRule =>
  asMock<TagActionRule>({
    actionPayload: { placement: 'first', skillSlug: 'grilling' },
    actionType: 'inject-task',
    enabled: true,
    environment: null,
    id: 'rule-1',
    projectId: null,
    status: null,
    tagAll: ['breakdown'],
    userId,
    ...overrides,
  });

describe('PlanRulesProcessor.process', () => {
  let processor: PlanRulesProcessor;
  let registry: ActionExecutorRegistry;
  let executor: ActionExecutor;
  let plansFindOne: ReturnType<typeof vi.fn>;
  let ruleApplicationsService: RuleApplicationsService;
  let tagActionRulesService: TagActionRulesService;
  let tagsService: TagsService;
  let usersService: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    registry = new ActionExecutorRegistry(createMock<LoggerService>());
    executor = { actionType: 'inject-task', execute: vi.fn() };

    plansFindOne = vi.fn().mockResolvedValue(buildPlan());
    const plansService = createMock<PlansService>({
      getRepository: vi.fn(() => asMock({ findOne: plansFindOne })),
    });

    usersService = createMock<UsersService>({
      findByGithubUsername: vi
        .fn()
        .mockResolvedValue(asMock<User>({ id: userId })),
    });
    tagsService = createMock<TagsService>({
      getEffectiveTagSet: vi.fn().mockResolvedValue([
        {
          confidence: null,
          dimension: 'phase',
          source: 'agent',
          tag: 'breakdown',
        },
      ]),
    });
    tagActionRulesService = createMock<TagActionRulesService>({
      listEnabledForUser: vi.fn().mockResolvedValue([buildRule()]),
    });
    ruleApplicationsService = createMock<RuleApplicationsService>({
      findByRuleAndPlan: vi.fn().mockResolvedValue(null),
      orphanUnmatchedApplications: vi.fn().mockResolvedValue(0),
      record: vi.fn(),
    });

    processor = new PlanRulesProcessor(
      registry,
      createMock<LoggerService>(),
      plansService,
      ruleApplicationsService,
      tagActionRulesService,
      tagsService,
      usersService,
    );
  });

  it('dispatches a fresh match to the registered executor', async () => {
    registry.register(executor);

    const result = await processor.process(buildJob());

    expect(executor.execute).toHaveBeenCalledTimes(1);
    expect(executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        action: expect.objectContaining({ ruleId: 'rule-1' }),
        rule: expect.objectContaining({ id: 'rule-1' }),
      }),
    );
    expect(result).toEqual({
      dispatched: 1,
      matched: 1,
      orphaned: 0,
      skipped: null,
    });
  });

  it('no-ops on duplicate delivery: an existing ledger row in ANY state blocks dispatch', async () => {
    registry.register(executor);
    vi.mocked(ruleApplicationsService.findByRuleAndPlan).mockResolvedValue(
      asMock<RuleApplication>({ state: 'flagged' }),
    );

    const result = await processor.process(buildJob());

    expect(executor.execute).not.toHaveBeenCalled();
    expect(result.dispatched).toBe(0);
    expect(result.matched).toBe(1);
  });

  it('skips a matched action with no registered executor WITHOUT writing a ledger row', async () => {
    const result = await processor.process(buildJob());

    expect(ruleApplicationsService.record).not.toHaveBeenCalled();
    expect(result.dispatched).toBe(0);
    expect(result.matched).toBe(1);
  });

  it('flips un-matched applied rows to orphaned (matched rule ids are exempt)', async () => {
    registry.register(executor);
    vi.mocked(
      ruleApplicationsService.orphanUnmatchedApplications,
    ).mockResolvedValue(2);

    const result = await processor.process(buildJob());

    expect(
      ruleApplicationsService.orphanUnmatchedApplications,
    ).toHaveBeenCalledWith(planId, ['rule-1']);
    expect(result.orphaned).toBe(2);
  });

  it('an executor blocked by its own gating writes flagged via the ledger (contract shape)', async () => {
    const flaggingExecutor: ActionExecutor = {
      actionType: 'inject-task',
      execute: vi.fn(async ({ action, plan }) => {
        await ruleApplicationsService.record({
          details: { reason: 'skill-unavailable' },
          planId: plan.id,
          ruleId: action.ruleId,
          state: 'flagged',
        });
      }),
    };
    registry.register(flaggingExecutor);

    await processor.process(buildJob());

    expect(ruleApplicationsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        details: { reason: 'skill-unavailable' },
        state: 'flagged',
      }),
    );
  });

  it('skips when the plan is missing', async () => {
    plansFindOne.mockResolvedValue(null);

    const result = await processor.process(buildJob());

    expect(result.skipped).toBe('plan-missing');
  });

  it('skips when the plan author has no user row (no rules to evaluate)', async () => {
    vi.mocked(usersService.findByGithubUsername).mockResolvedValue(null);

    const result = await processor.process(buildJob());

    expect(result.skipped).toBe('no-owner');
  });
});
