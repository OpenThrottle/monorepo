import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { SkillAvailabilityRule } from './skill-availability-rule.entity.ts';
import type { SkillAvailabilityRulesRepository } from './skill-availability-rules.repository.ts';

/**
 * @description Scalar/column fields of {@link SkillAvailabilityRule} (no relations).
 * @public
 */
export type SkillAvailabilityRuleData = Omit<SkillAvailabilityRule, 'ruleSet'>;

/**
 * @description A {@link SkillAvailabilityRulesRepository} mock: every inherited
 * `BaseRepository` method plus the rule ones.
 * @public
 */
export interface SkillAvailabilityRulesRepositoryMock extends BaseRepositoryMock<
  SkillAvailabilityRule,
  CreateModelInput<SkillAvailabilityRule>
> {
  readonly findRuleById: Mock<SkillAvailabilityRulesRepository['findRuleById']>;
  readonly listByRuleSetId: Mock<
    SkillAvailabilityRulesRepository['listByRuleSetId']
  >;
  readonly removeRule: Mock<SkillAvailabilityRulesRepository['removeRule']>;
}
