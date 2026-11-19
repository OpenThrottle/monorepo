import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity.ts';
import type { SkillAvailabilityRuleSetsRepository } from './skill-availability-rule-sets.repository.ts';

/**
 * @description Scalar/column fields of {@link SkillAvailabilityRuleSet} (no relations).
 * @public
 */
export type SkillAvailabilityRuleSetData = Omit<
  SkillAvailabilityRuleSet,
  'project' | 'rules'
>;

/**
 * @description A {@link SkillAvailabilityRuleSetsRepository} mock: every inherited
 * `BaseRepository` method plus the rule-set ones.
 * @public
 */
export interface SkillAvailabilityRuleSetsRepositoryMock extends BaseRepositoryMock<
  SkillAvailabilityRuleSet,
  CreateModelInput<SkillAvailabilityRuleSet>
> {
  readonly ensureForProject: Mock<
    SkillAvailabilityRuleSetsRepository['ensureForProject']
  >;
  readonly findByProjectId: Mock<
    SkillAvailabilityRuleSetsRepository['findByProjectId']
  >;
  readonly removeForProject: Mock<
    SkillAvailabilityRuleSetsRepository['removeForProject']
  >;
  readonly upsertPosture: Mock<
    SkillAvailabilityRuleSetsRepository['upsertPosture']
  >;
}
