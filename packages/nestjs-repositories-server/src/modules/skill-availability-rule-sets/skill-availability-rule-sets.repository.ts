import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { IsNull, Repository } from 'typeorm';

import { SkillAvailabilityRule } from '../skill-availability-rules/skill-availability-rule.entity.ts';
import { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity.ts';

/**
 * @description Data access for the openthrottle `skill_availability_rule_sets` table on the
 * default connection: the `BaseRepository` CRUD (soft deletes) plus the per-project lookups. A
 * project has at most one live rule set; it carries the single posture. Soft deleting a rule set
 * soft deletes its live rules in the same transaction, since a soft delete fires none of the
 * foreign key actions.
 * @public
 */
@Injectable()
export class SkillAvailabilityRuleSetsRepository extends BaseRepository<
  SkillAvailabilityRuleSet,
  CreateModelInput<SkillAvailabilityRuleSet>
> {
  protected readonly tableName = 'skill_availability_rule_sets';

  constructor(
    @InjectRepository(SkillAvailabilityRuleSet)
    repository: Repository<SkillAvailabilityRuleSet>,
  ) {
    super(repository);
  }

  /**
   * @description Finds the project's live rule set, or null when it has none.
   */
  async findByProjectId(
    projectId: string,
  ): Promise<SkillAvailabilityRuleSet | null> {
    return this.findOne({ where: { projectId } });
  }

  /**
   * @description Creates the project's rule set with `posture`, or sets the posture of its live
   * one. Idempotent on the project.
   */
  async upsertPosture(
    projectId: string,
    posture: string,
  ): Promise<SkillAvailabilityRuleSet> {
    const existing = await this.findByProjectId(projectId);
    if (existing) {
      return this.update(existing.id, { posture });
    }
    return this.create({ posture, projectId });
  }

  /**
   * @description Returns the project's live rule set, creating it with the default `allow`
   * posture when the project has none.
   */
  async ensureForProject(projectId: string): Promise<SkillAvailabilityRuleSet> {
    const existing = await this.findByProjectId(projectId);
    if (existing) {
      return existing;
    }
    return this.create({ posture: 'allow', projectId });
  }

  /**
   * @description Soft deletes the project's live rule set and its live rules in one transaction.
   * Returns false when the project had no live rule set.
   */
  async removeForProject(projectId: string): Promise<boolean> {
    return this.repository.manager.transaction(async (manager) => {
      const ruleSet = await manager.findOne(SkillAvailabilityRuleSet, {
        where: { deletedAt: IsNull(), projectId },
      });
      if (!ruleSet) {
        return false;
      }

      await manager.softDelete(SkillAvailabilityRule, {
        deletedAt: IsNull(),
        ruleSetId: ruleSet.id,
      });
      await manager.softDelete(SkillAvailabilityRuleSet, {
        deletedAt: IsNull(),
        id: ruleSet.id,
      });
      return true;
    });
  }
}
