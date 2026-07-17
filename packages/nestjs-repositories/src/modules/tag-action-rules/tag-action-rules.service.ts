/**
 * @description CRUD for tag_action_rules (user-owned declarative tag→action
 * rules). Payloads are Zod-validated per action type at write time
 * (parseTagActionPayload) so the evaluate worker and executors can trust
 * stored payloads. Matching itself is the pure evaluateTagActionRules in
 * @openthrottle/openthrottle-skills — this service only stores rules.
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  isTagActionType,
  parseTagActionPayload,
} from '@openthrottle/openthrottle-skills';
import { Repository } from 'typeorm';
import { ZodError } from 'zod';
import { TagActionRule } from './tag-action-rule.entity';

/** @public */
export interface UpsertTagActionRuleInput {
  readonly actionPayload: unknown;
  readonly actionType: string;
  readonly enabled?: boolean;
  readonly environment?: string | null;
  /** When present, updates the existing rule (must belong to the user). */
  readonly id?: string | null;
  readonly projectId?: string | null;
  readonly status?: string | null;
  readonly tagAll?: readonly string[];
  readonly title: string;
}

@Injectable()
export class TagActionRulesService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(TagActionRule)
    private readonly repository: Repository<TagActionRule>,
  ) {
    this.logger.debug('📏 tag-action-rules 📏');
  }

  /**
   * @description Returns the TypeORM repository for tag action rules.
   */
  getRepository(): Repository<TagActionRule> {
    return this.repository;
  }

  /**
   * @description Lists the user's rules, oldest first.
   */
  async listForUser(userId: string): Promise<TagActionRule[]> {
    return this.repository.find({
      order: { createdAt: 'ASC' },
      where: { userId },
    });
  }

  /**
   * @description Finds one of the user's rules by id; null when absent or owned
   * by someone else (so callers can 404 without leaking existence).
   */
  async findForUser(userId: string, id: string): Promise<TagActionRule | null> {
    return this.repository.findOne({ where: { id, userId } });
  }

  /**
   * @description Lists the user's ENABLED rules for evaluation, oldest first.
   */
  async listEnabledForUser(userId: string): Promise<TagActionRule[]> {
    return this.repository.find({
      order: { createdAt: 'ASC' },
      where: { enabled: true, userId },
    });
  }

  /**
   * @description Creates or updates a rule for the user. The action payload is
   * parsed (and defaulted) against the action type's Zod schema; failures map
   * to BadRequest with the Zod issues.
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
            .map(
              (issue) =>
                `${issue.path.join('.') || '(root)'}: ${issue.message}`,
            )
            .join('; ')}`,
        );
      }
      throw error;
    }

    if (input.id != null) {
      const existing = await this.repository.findOne({
        where: { id: input.id, userId },
      });
      if (existing == null) {
        throw new NotFoundException(`Rule "${input.id}" not found.`);
      }

      existing.actionPayload = parsedPayload;
      existing.actionType = input.actionType;
      existing.enabled = input.enabled ?? existing.enabled;
      existing.environment = input.environment ?? null;
      existing.projectId = input.projectId ?? null;
      existing.status = input.status ?? null;
      existing.tagAll = [...(input.tagAll ?? [])];
      existing.title = title;
      return this.repository.save(existing);
    }

    const entity = this.repository.create({
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
    return this.repository.save(entity);
  }

  /**
   * @description Deletes the user's rule (ledger rows CASCADE with it).
   * Returns false when absent.
   */
  async deleteRule(userId: string, id: string): Promise<boolean> {
    const result = await this.repository.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }
}
