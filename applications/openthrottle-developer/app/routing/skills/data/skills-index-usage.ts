/**
 * @description Prop shape for the aggregate usage sections on the /skills index
 * route (all skills, 30-day window). Mirrors the shared daily chart series plus
 * the leaderboard `bySkill` rows, and degrades to an `unavailable` state when
 * the query could not be loaded (no settings:read permission, or a server
 * error). Parallels `SkillDetailUsageData` for the single-skill detail card.
 */

import type { SkillUsageChartDatum } from '~/global/data/skill-usage-chart';
import type { UsageSkillUsageBySkillFragment } from '~/__generated__/graphql';

/**
 * Discriminated usage state for the index sections:
 * - `available: false` → the query failed/was unauthorized (unavailable notice).
 * - `available: true` → loaded; `bySkill` empty renders the empty leaderboard
 *   message while the (empty) chart still mounts.
 */
export type SkillsIndexUsageData =
  | { readonly available: false }
  | {
      readonly available: true;
      readonly byDay: readonly SkillUsageChartDatum[];
      readonly bySkill: readonly UsageSkillUsageBySkillFragment[];
    };
