/**
 * @description Unit tests for {@link AttachPromptExecutor}: every ledger state
 * (applied, pre-satisfied, flagged prompt-unavailable / invalid-payload),
 * resolution by id and by file path, and the owner-visibility gate.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  CustomPrompt,
  CustomPromptsRepository,
  Plan,
  RuleApplication,
  RuleApplicationsRepository,
  TagActionRule,
} from '@openthrottle/nestjs-repositories-server';
import type {
  CustomPromptsRepositoryMock,
  RuleApplicationsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createCustomPromptsRepositoryMock,
  createRuleApplicationsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { MatchedTagAction } from '@openthrottle/openthrottle-skills';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActionExecutorRegistry } from './action-executor-registry/action-executor-registry.service.ts';
import type { ActionExecutorContext } from './action-executor-registry/action-executor-registry.types.ts';
import { AttachPromptExecutor } from './attach-prompt.executor.ts';

const PLAN_ID = '00000000-0000-4000-8000-0000000000a1';
const OWNER_ID = '00000000-0000-4000-8000-0000000000b2';
const PROMPT_ID = '00000000-0000-4000-8000-0000000000c3';

describe('AttachPromptExecutor', () => {
  let customPromptsRepository: CustomPromptsRepositoryMock;
  let executor: AttachPromptExecutor;
  let ruleApplicationsRepository: RuleApplicationsRepositoryMock;

  const buildContext = (actionPayload: unknown): ActionExecutorContext => {
    return {
      action: asMock<MatchedTagAction>({
        actionPayload,
        actionType: 'attach-prompt',
        matchedTags: ['review'],
        ruleId: 'rule-1',
      }),
      ownerUserId: OWNER_ID,
      plan: asMock<Plan>({ id: PLAN_ID }),
      rule: asMock<TagActionRule>({ id: 'rule-1' }),
    };
  };

  const idPayload = {
    placement: 'start',
    promptId: PROMPT_ID,
    promptType: 'personas',
  };

  const prompt = asMock<CustomPrompt>({
    id: PROMPT_ID,
    promptType: 'personas',
    userId: OWNER_ID,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    customPromptsRepository = createCustomPromptsRepositoryMock();
    ruleApplicationsRepository = createRuleApplicationsRepositoryMock();

    executor = new AttachPromptExecutor(
      asMock<CustomPromptsRepository>(customPromptsRepository),
      createMock<ActionExecutorRegistry>(),
      createMock<LoggerService>(),
      asMock<RuleApplicationsRepository>(ruleApplicationsRepository),
    );
  });

  it('registers itself on module init without reconcile or reinject', () => {
    const registry = new ActionExecutorRegistry(createMock<LoggerService>());
    const local = new AttachPromptExecutor(
      asMock<CustomPromptsRepository>(customPromptsRepository),
      registry,
      createMock<LoggerService>(),
      asMock<RuleApplicationsRepository>(ruleApplicationsRepository),
    );

    local.onModuleInit();

    expect(registry.get('attach-prompt')).toBe(local);
    expect(local).not.toHaveProperty('reconcile');
    expect(local).not.toHaveProperty('reinject');
  });

  describe('applied', () => {
    it('attaches a prompt referenced by id with the resolved id', async () => {
      customPromptsRepository.findVisibleById.mockResolvedValue(prompt);

      await executor.execute(buildContext(idPayload));

      expect(customPromptsRepository.findVisibleById).toHaveBeenCalledWith(
        PROMPT_ID,
        OWNER_ID,
      );
      expect(ruleApplicationsRepository.record).toHaveBeenCalledWith({
        details: {
          placement: 'start',
          promptId: PROMPT_ID,
          promptType: 'personas',
        },
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: 'applied',
      });
    });

    it('records the resolved promptId for a filePath reference, defaulting placement to end', async () => {
      customPromptsRepository.findVisibleByFilePath.mockResolvedValue(prompt);

      await executor.execute(
        buildContext({ filePath: 'personas/a.md', promptType: 'personas' }),
      );

      expect(
        customPromptsRepository.findVisibleByFilePath,
      ).toHaveBeenCalledWith('personas/a.md', 'personas', OWNER_ID);
      expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
        expect.objectContaining({
          details: {
            placement: 'end',
            promptId: PROMPT_ID,
            promptType: 'personas',
          },
          state: 'applied',
        }),
      );
    });
  });

  describe('pre-satisfied', () => {
    it('records pre-satisfied when another rule already attached the prompt', async () => {
      customPromptsRepository.findVisibleById.mockResolvedValue(prompt);
      ruleApplicationsRepository.findAppliedAttachPrompt.mockResolvedValue(
        asMock<RuleApplication>({ ruleId: 'rule-0' }),
      );

      await executor.execute(buildContext(idPayload));

      expect(
        ruleApplicationsRepository.findAppliedAttachPrompt,
      ).toHaveBeenCalledWith(PLAN_ID, PROMPT_ID);
      expect(ruleApplicationsRepository.record).toHaveBeenCalledWith({
        details: {
          promptId: PROMPT_ID,
          reason: 'already-attached',
          ruleId: 'rule-0',
        },
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: 'pre-satisfied',
      });
    });
  });

  describe('flagged', () => {
    it('flags prompt-unavailable when the prompt is missing, deleted or owned by someone else', async () => {
      customPromptsRepository.findVisibleById.mockResolvedValue(null);

      await executor.execute(buildContext(idPayload));

      expect(ruleApplicationsRepository.record).toHaveBeenCalledWith({
        details: { reason: 'prompt-unavailable' },
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: 'flagged',
      });
    });

    it('flags prompt-unavailable when a filePath matches nothing visible', async () => {
      await executor.execute(
        buildContext({ filePath: 'gone.md', promptType: 'prompts' }),
      );

      expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { reason: 'prompt-unavailable' },
          state: 'flagged',
        }),
      );
    });

    it('flags prompt-unavailable when the prompt type differs from the payload', async () => {
      customPromptsRepository.findVisibleById.mockResolvedValue(
        asMock<CustomPrompt>({
          id: PROMPT_ID,
          promptType: 'rules',
          userId: null,
        }),
      );

      await executor.execute(buildContext(idPayload));

      expect(ruleApplicationsRepository.record).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { reason: 'prompt-unavailable' },
          state: 'flagged',
        }),
      );
    });

    it('flags invalid-payload without resolving anything', async () => {
      await executor.execute(buildContext({ placement: 'start' }));

      expect(customPromptsRepository.findVisibleById).not.toHaveBeenCalled();
      expect(
        customPromptsRepository.findVisibleByFilePath,
      ).not.toHaveBeenCalled();
      expect(ruleApplicationsRepository.record).toHaveBeenCalledWith({
        details: { reason: 'invalid-payload' },
        planId: PLAN_ID,
        ruleId: 'rule-1',
        state: 'flagged',
      });
    });
  });
});
