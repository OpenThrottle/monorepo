/**
 * @description Selector for skill-usage counts by scope, so summary tiles can
 * read a single scope's total from the aggregated by-scope rows.
 */

import type { UsageSkillUsageByScopeFragment } from '~/__generated__/graphql';

/** Count for a given scope, or 0 when the scope has no rows. */
export const skillUsageScopeCount = (
  byScope: readonly UsageSkillUsageByScopeFragment[],
  scope: string,
): number => byScope.find((row) => row.scope === scope)?.count ?? 0;
