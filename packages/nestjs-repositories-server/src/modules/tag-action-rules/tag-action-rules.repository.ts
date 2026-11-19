import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { TagActionRule } from './tag-action-rule.entity.ts';

/**
 * @description Data access for the openthrottle `tag_action_rules` table on the default
 * connection: the `BaseRepository` CRUD (soft deletes) plus the user-scoped lookups. Only live
 * rules are read; a soft-deleted rule keeps its `rule_applications` ledger rows, which are
 * reachable only through a live rule. Payload validation lives in the server's
 * tag-action-rules service, not here.
 * @public
 */
@Injectable()
export class TagActionRulesRepository extends BaseRepository<
  TagActionRule,
  CreateModelInput<TagActionRule>
> {
  protected readonly tableName = 'tag_action_rules';

  constructor(
    @InjectRepository(TagActionRule)
    repository: Repository<TagActionRule>,
  ) {
    super(repository);
  }

  /**
   * @description Lists the user's live rules, oldest first.
   */
  async listForUser(userId: string): Promise<TagActionRule[]> {
    return this.findBy({ order: { createdAt: 'ASC' }, where: { userId } });
  }

  /**
   * @description Finds one of the user's live rules by id; null when absent or owned by someone
   * else, so callers can 404 without leaking existence. Named apart from the inherited
   * `findById`, which throws on a miss.
   */
  async findForUser(userId: string, id: string): Promise<TagActionRule | null> {
    return this.findOne({ where: { id, userId } });
  }

  /**
   * @description Lists the user's live, ENABLED rules for evaluation, oldest first.
   */
  async listEnabledForUser(userId: string): Promise<TagActionRule[]> {
    return this.findBy({
      order: { createdAt: 'ASC' },
      where: { enabled: true, userId },
    });
  }

  /**
   * @description Soft deletes the user's live rule. Returns false when it is absent or owned by
   * someone else. Its `rule_applications` ledger rows are kept.
   */
  async removeForUser(userId: string, id: string): Promise<boolean> {
    const { removedCount } = await this.removeMany({ id, userId });
    return removedCount > 0;
  }
}
