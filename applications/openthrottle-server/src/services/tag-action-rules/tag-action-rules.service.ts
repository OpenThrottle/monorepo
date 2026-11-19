import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TagActionRule } from '@openthrottle/nestjs-repositories-server';
import { TagActionRulesRepository } from '@openthrottle/nestjs-repositories-server';
import {
  isTagActionType,
  parseTagActionPayload,
} from '@openthrottle/openthrottle-skills';
import { ZodError } from 'zod';

import type { UpsertTagActionRuleInput } from './tag-action-rules.types.ts';

/**
 * @description Validated writes for tag_action_rules (user-owned declarative tag to action
 * rules). Payloads are Zod-validated per action type at write time (parseTagActionPayload) so
 * the evaluate worker and executors can trust stored payloads. Matching itself is the pure
 * evaluateTagActionRules in @openthrottle/openthrottle-skills; storage is
 * `TagActionRulesRepository`.
 */
@Injectable()
export class TagActionRulesService {
  constructor(private readonly repository: TagActionRulesRepository) {}

  /**
   * @description Creates or updates a rule for the user. The action payload is parsed (and
   * defaulted) against the action type's Zod schema; failures map to BadRequest with the Zod
   * issues.
   */
  async upsertRule(
    userId: string,
    input: UpsertTagActionRuleInput,
  ): Promise<TagActionRule> {
    if (!isTagActionType(input.actionType)) {
      throw new BadRequestException(
        `Unknown action type "${input.actionType}": expected "inject-task" or "availability-exception".`,
      );
    }

    const title = input.title?.trim() ?? '';
    if (title === '') {
      throw new BadRequestException('Rule title must not be empty.');
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = parseTagActionPayload(
        input.actionType,
        input.actionPayload,
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException(
          `Invalid ${input.actionType} payload: ${error.issues
            .map((issue) => {
              return `${issue.path.join('.') || '(root)'}: ${issue.message}`;
            })
            .join('; ')}`,
        );
      }
      throw error;
    }

    if (input.id != null) {
      const existing = await this.repository.findForUser(userId, input.id);
      if (existing == null) {
        throw new NotFoundException(`Rule "${input.id}" not found.`);
      }

      return this.repository.update(existing.id, {
        actionPayload: parsedPayload,
        actionType: input.actionType,
        enabled: input.enabled ?? existing.enabled,
        environment: input.environment ?? null,
        projectId: input.projectId ?? null,
        status: input.status ?? null,
        tagAll: [...(input.tagAll ?? [])],
        title,
      });
    }

    return this.repository.create({
      actionPayload: parsedPayload,
      actionType: input.actionType,
      enabled: input.enabled ?? true,
      environment: input.environment ?? null,
      projectId: input.projectId ?? null,
      status: input.status ?? null,
      tagAll: [...(input.tagAll ?? [])],
      title,
      userId,
    });
  }
}
