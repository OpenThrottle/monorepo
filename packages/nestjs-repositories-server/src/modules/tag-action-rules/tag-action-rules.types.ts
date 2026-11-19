import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { TagActionRule } from './tag-action-rule.entity.ts';
import type { TagActionRulesRepository } from './tag-action-rules.repository.ts';

/**
 * @description Scalar/column fields of {@link TagActionRule} (no relations). Use to type DTOs
 * that mirror the entity.
 * @public
 */
export type TagActionRuleData = Omit<TagActionRule, 'project' | 'user'>;

/**
 * @description A {@link TagActionRulesRepository} mock: every inherited `BaseRepository`
 * method plus the tag-action-rule ones.
 * @public
 */
export interface TagActionRulesRepositoryMock extends BaseRepositoryMock<
  TagActionRule,
  CreateModelInput<TagActionRule>
> {
  readonly findForUser: Mock<TagActionRulesRepository['findForUser']>;
  readonly listEnabledForUser: Mock<
    TagActionRulesRepository['listEnabledForUser']
  >;
  readonly listForUser: Mock<TagActionRulesRepository['listForUser']>;
  readonly removeForUser: Mock<TagActionRulesRepository['removeForUser']>;
}
