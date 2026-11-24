/**
 * @description Split leaderboard rows into the ones you can still invoke and
 * the ones that only exist as history, resolving each row's presence once.
 *
 * Early in adoption the ranking churns: skills get renamed, moved, deleted, or
 * vendored away, and their recorded history keeps them at the top of "Top
 * skills" even though nobody can invoke them any more. The stats are real and
 * worth keeping, but they should not compete with live skills for the top of
 * the list — so they move to their own de-emphasized section.
 *
 * Pure and React-free; both `/skills` and `/usage` call it so the two routes
 * cannot drift.
 */

import type { UsageSkillUsageBySkillFragment } from '~/__generated__/graphql';
import type { SkillPresence } from '~/routing/usage/data/data.skill-presence';
import { SKILL_PRESENCE } from '~/routing/usage/data/data.skill-presence';
import { classifySkillUsagePresence } from '~/routing/usage/utils/classifySkillUsagePresence';

/** A leaderboard row with its presence already resolved by the caller. */
export interface SkillUsageRowWithPresence extends UsageSkillUsageBySkillFragment {
  /**
   * The skill declares `metadata.outcome-telemetry: 'none'`: it reports no
   * outcome or duration on purpose, so an empty metric is a decision rather
   * than a measurement gap.
   */
  readonly isOutcomeTelemetryOptedOut: boolean;
  readonly presence: SkillPresence;
}

/** The two buckets the leaderboard renders as separate tables. */
export interface PartitionedSkillUsage {
  /** Rows still invokable in this checkout: `installed`, `personal`, `external`. */
  readonly active: readonly SkillUsageRowWithPresence[];
  /** `ours` or `personal` rows with recorded usage but no SKILL.md on disk. */
  readonly missing: readonly SkillUsageRowWithPresence[];
}

/**
 * Partition `bySkill` by presence, preserving the input order within each
 * bucket — the server's ranking is the ranking, so nothing is re-sorted here.
 * Every returned row carries its `presence` and its outcome-telemetry opt-out,
 * so the table component renders exactly what it is given and never re-derives
 * either.
 */
export const partitionSkillUsageByPresence = (
  bySkill: readonly UsageSkillUsageBySkillFragment[],
  presentSlugs: ReadonlySet<string>,
  optedOutSlugs: ReadonlySet<string>,
): PartitionedSkillUsage => {
  const active: SkillUsageRowWithPresence[] = [];
  const missing: SkillUsageRowWithPresence[] = [];

  for (const row of bySkill) {
    const presence = classifySkillUsagePresence(row, presentSlugs);
    const bucket = presence === SKILL_PRESENCE.MISSING ? missing : active;

    bucket.push({
      ...row,
      isOutcomeTelemetryOptedOut: optedOutSlugs.has(row.skillName),
      presence,
    });
  }

  return { active, missing };
};
