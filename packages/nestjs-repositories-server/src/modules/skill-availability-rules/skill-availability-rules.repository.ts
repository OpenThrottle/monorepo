import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { SkillAvailabilityRule } from './skill-availability-rule.entity.ts';

/**
 * @description Data access for the openthrottle `skill_availability_rules` table on the default
 * connection: the `BaseRepository` CRUD (soft deletes) plus the rule-set-scoped list and the
 * nullable and boolean lookups the rule editor needs. Rules of a rule set that was soft deleted
 * are soft deleted with it (see `SkillAvailabilityRuleSetsRepository.removeForProject`).
 * @public
 */
@Injectable()
export class SkillAvailabilityRulesRepository extends BaseRepository<
  SkillAvailabilityRule,
  CreateModelInput<SkillAvailabilityRule>
> {
  protected readonly tableName = 'skill_availability_rules';

  constructor(
    @InjectRepository(SkillAvailabilityRule)
    repository: Repository<SkillAvailabilityRule>,
  ) {
    super(repository);
  }

  /**
   * @description Finds a live rule by id. Returns null when not found; the inherited `findById`
   * throws instead.
   */
  async findRuleById(id: string): Promise<SkillAvailabilityRule | null> {
    return this.findOne({ where: { id } });
  }

  /**
   * @description Lists a rule set's live rules in creation order, so the output is deterministic.
   */
  async listByRuleSetId(ruleSetId: string): Promise<SkillAvailabilityRule[]> {
    return this.findBy({
      order: { createdAt: 'ASC', id: 'ASC' },
      where: { ruleSetId },
    });
  }

  /**
   * @description Soft deletes a live rule by id. Returns false when no live rule has that id;
   * the inherited `remove` throws instead.
   */
  async removeRule(id: string): Promise<boolean> {
    const { removedCount } = await this.removeMany({ id });
    return removedCount > 0;
  }
}
