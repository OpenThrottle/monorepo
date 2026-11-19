import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { TagActionRule } from './tag-action-rule.entity.ts';
import type { TagActionRulesRepositoryMock } from './tag-action-rules.types.ts';

/**
 * @description Builds a {@link TagActionRulesRepositoryMock} that starts as an empty
 * `tag_action_rules` table (see `createBaseRepositoryMock`): nothing is listed or found and
 * `removeForUser` reports nothing removed. Provide it in place of `TagActionRulesRepository`
 * and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createTagActionRulesRepositoryMock(): TagActionRulesRepositoryMock {
  return {
    ...createBaseRepositoryMock<TagActionRule, CreateModelInput<TagActionRule>>(
      'tag_action_rules',
    ),
    findForUser: vi.fn(async () => {
      return null;
    }),
    listEnabledForUser: vi.fn(async () => {
      return [];
    }),
    listForUser: vi.fn(async () => {
      return [];
    }),
    removeForUser: vi.fn(async () => {
      return false;
    }),
  };
}
