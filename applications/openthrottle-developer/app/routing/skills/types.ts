import type { UsageSkillUsageBySkillFragment } from '~/__generated__/graphql';
import type { SkillUsageChartDatum } from '~/global/data/data.skill-usage-chart';

/**
 * The composed invocation the parent submits through the streamed-conversation
 * path. `message` is the `/<slug> <args>` command; `fields` are the
 * `StartConversationStreamInput`-shaped values derived from the picked option.
 */
export interface RunSkillPayload {
  readonly fields: Record<string, string>;
  readonly message: string;
}

/** One skill's aggregates over the range — shaped like the bySkill fragment. */
export interface SkillDetailUsageSkillStats {
  readonly abandonedCount: number;
  readonly avgDurationMs: number | null;
  readonly count: number;
  readonly errorCount: number;
  /** ISO timestamp of the most recent invocation in range; null when none. */
  readonly lastUsedAt: string | null;
  /** QUALITY outcomes only — success + error. Never counts session-end records. */
  readonly outcomeCount: number;
  readonly scope: string;
  /** Automatic session-end records: liveness, not quality. */
  readonly sessionEndedCount: number;
  readonly skillName: string;
  readonly successCount: number;
}

/**
 * @description Prop shapes for the per-skill usage detail surface on
 * /skills/$slug. Mirrors the `skillUsage` bySkill row (single skill) plus the
 * shared daily series, and degrades to an `unavailable` state when the query
 * could not be loaded (no settings:read permission, or a server error).
 *
 * Discriminated usage state for the detail card:
 * - `available: false` → the query failed/was unauthorized (unavailable notice).
 * - `available: true, skill: null` → skill exists on disk but no invocations in
 *   range (empty state).
 * - `available: true, skill: {...}` → populated.
 */
export type SkillDetailUsageData =
  | { readonly available: false }
  | {
      readonly available: true;
      readonly byDay: readonly SkillUsageChartDatum[];
      readonly skill: SkillDetailUsageSkillStats | null;
    };

/**
 * @description Prop shape for the aggregate usage sections on the /skills index
 * route (all skills, 30-day window). Mirrors the shared daily chart series plus
 * the leaderboard `bySkill` rows, and degrades to an `unavailable` state when
 * the query could not be loaded. Parallels {@link SkillDetailUsageData}.
 *
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
