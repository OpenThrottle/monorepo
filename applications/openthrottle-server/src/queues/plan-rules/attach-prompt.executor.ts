/**
 * @description The 'attach-prompt' ActionExecutor: a matched rule attaches a
 * custom prompt (a persona or a prompt) to the plan at a placement (start or
 * end of the composed context). execute() runs for first-time (rule, plan)
 * pairs (the worker's fingerprint pre-check), then:
 *
 * 1. invalid-payload — a payload that fails the attach-prompt schema ledgers
 *    'flagged' {reason: 'invalid-payload'} (rules are validated at write time,
 *    so this is defensive).
 * 2. resolve + gate — the `custom_prompts` row is resolved by id, or by
 *    (file_path, prompt_type), among LIVE rows the rule owner can see:
 *    `user_id` = the owner, or `user_id IS NULL` (a system row). By path a
 *    user-owned row wins over a system row. A missing, soft-deleted or
 *    other-owner prompt ledgers 'flagged' {reason: 'prompt-unavailable'} (the
 *    two are deliberately indistinguishable) instead of throwing, so a
 *    dangling reference never stalls the plan.
 * 3. pre-satisfied — another 'applied' attach-prompt row on the plan already
 *    carries the resolved prompt id: ledgers 'pre-satisfied' {promptId,
 *    reason: 'already-attached', ruleId: <that rule>}.
 * 4. attach — ledgers 'applied' {placement, promptId (always the RESOLVED id,
 *    even for a filePath reference), promptType}.
 *
 * There is no attachment table: the rule_applications ledger row IS the
 * attachment record. Attachment is a static ledger fact, so `reconcile` and
 * `reinject` are omitted — there is no continuous invariant to re-establish
 * and nothing to undo. Composing attached prompts into an agent's context is a
 * consumer concern not implemented here.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type CustomPrompt,
  CustomPromptsRepository,
  RULE_APPLICATION_STATES,
  RuleApplicationsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  type AttachPromptActionPayload,
  attachPromptActionPayloadSchema,
  TAG_ACTION_TYPES,
} from '@openthrottle/openthrottle-skills';

import { ActionExecutorRegistry } from './action-executor-registry/action-executor-registry.service.ts';
import type {
  ActionExecutor,
  ActionExecutorContext,
} from './action-executor-registry/action-executor-registry.types.ts';

@Injectable()
export class AttachPromptExecutor implements ActionExecutor, OnModuleInit {
  readonly actionType = TAG_ACTION_TYPES.ATTACH_PROMPT;

  constructor(
    private readonly customPromptsRepository: CustomPromptsRepository,
    private readonly executorRegistry: ActionExecutorRegistry,
    private readonly logger: LoggerService,
    private readonly ruleApplicationsRepository: RuleApplicationsRepository,
  ) {}

  onModuleInit(): void {
    this.executorRegistry.register(this);
  }

  async execute(context: ActionExecutorContext): Promise<void> {
    const { action, ownerUserId, plan, rule } = context;

    const parsed = attachPromptActionPayloadSchema.safeParse(
      action.actionPayload,
    );
    if (!parsed.success) {
      await this.flag(plan.id, rule.id, { reason: 'invalid-payload' });
      return;
    }

    const payload = parsed.data;
    const prompt = await this.resolvePrompt(payload, ownerUserId);
    if (prompt == null) {
      await this.flag(plan.id, rule.id, { reason: 'prompt-unavailable' });
      return;
    }

    const existing =
      await this.ruleApplicationsRepository.findAppliedAttachPrompt(
        plan.id,
        prompt.id,
      );
    if (existing != null) {
      await this.ruleApplicationsRepository.record({
        details: {
          promptId: prompt.id,
          reason: 'already-attached',
          ruleId: existing.ruleId,
        },
        planId: plan.id,
        ruleId: rule.id,
        state: RULE_APPLICATION_STATES.PRE_SATISFIED,
      });
      return;
    }

    this.logger.info(
      `attach-prompt rule ${rule.id} attached prompt ${prompt.id} (${payload.placement}) to plan ${plan.id}`,
      AttachPromptExecutor.name,
    );

    await this.ruleApplicationsRepository.record({
      details: {
        placement: payload.placement,
        promptId: prompt.id,
        promptType: prompt.promptType,
      },
      planId: plan.id,
      ruleId: rule.id,
      state: RULE_APPLICATION_STATES.APPLIED,
    });
  }

  private async flag(
    planId: string,
    ruleId: string,
    details: { readonly reason: string },
  ): Promise<void> {
    await this.ruleApplicationsRepository.record({
      details,
      planId,
      ruleId,
      state: RULE_APPLICATION_STATES.FLAGGED,
    });
  }

  /**
   * @description The live prompt the payload references that the owner can see, of the
   * payload's prompt type, or null.
   */
  private async resolvePrompt(
    payload: AttachPromptActionPayload,
    ownerUserId: string,
  ): Promise<CustomPrompt | null> {
    const prompt = await this.findVisiblePrompt(payload, ownerUserId);
    if (prompt == null || prompt.promptType !== payload.promptType) {
      return null;
    }
    return prompt;
  }

  private async findVisiblePrompt(
    payload: AttachPromptActionPayload,
    ownerUserId: string,
  ): Promise<CustomPrompt | null> {
    if (payload.promptId != null) {
      return this.customPromptsRepository.findVisibleById(
        payload.promptId,
        ownerUserId,
      );
    }
    return this.customPromptsRepository.findVisibleByFilePath(
      payload.filePath ?? '',
      payload.promptType,
      ownerUserId,
    );
  }
}
