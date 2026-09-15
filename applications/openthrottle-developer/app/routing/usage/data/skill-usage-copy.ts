/**
 * @description Static copy + scope labels for the Usage-route skill-usage
 * surface. Component files stay presentational; labels live here.
 */

export const SKILL_USAGE_SCOPES = {
  OURS: 'ours',
  THIRD_PARTY: 'third-party',
} as const;

export type SkillUsageScopeFilter =
  (typeof SKILL_USAGE_SCOPES)[keyof typeof SKILL_USAGE_SCOPES] | null;

/** Human label for a scope id. */
export const skillUsageScopeLabel = (scope: string): string => {
  if (scope === SKILL_USAGE_SCOPES.OURS) return 'Ours';
  if (scope === SKILL_USAGE_SCOPES.THIRD_PARTY) return 'Third-party';

  return scope;
};

/** Basename of a cwd for compact filter chips (full path stays in title). */
export const skillUsageCwdLabel = (cwd: string): string => {
  const parts = cwd.split('/').filter(Boolean);

  return parts.length > 0 ? (parts[parts.length - 1] ?? cwd) : cwd;
};

/**
 * Format avg duration for the leaderboard; em dash when no samples.
 *
 * Em dash is the COMMON case by design. Only a deliberate reporter supplies a
 * duration: no harness hook brackets a skill's own work, so the automatic
 * session-end paths report null rather than session-tail length.
 */
export const skillUsageAvgDurationLabel = (
  avgDurationMs: number | null | undefined,
): string => {
  if (avgDurationMs == null) return '—';
  if (avgDurationMs < 1000) return `${avgDurationMs}ms`;

  return `${(avgDurationMs / 1000).toFixed(1)}s`;
};

/**
 * Compact outcomes cell: "3/5" or em dash when none reported.
 *
 * `outcomeCount` is QUALITY outcomes only (success + error). Session-end and
 * abandoned records are excluded upstream, so a skill that never reports its own
 * outcome shows `—` — the honest reading of "nobody measured this", rather than
 * a full score assembled from "the session finished".
 */
export const skillUsageOutcomesLabel = (
  outcomeCount: number,
  startCount: number,
): string => {
  if (outcomeCount <= 0) return '—';

  return `${outcomeCount}/${startCount}`;
};

export const SKILL_USAGE_COPY = {
  avgDurationColumn: 'Avg duration',
  empty: `No skill invocations recorded yet in this range. Usage is captured by the harness PreToolUse hook when a Skill tool runs.`,
  emptyFiltered: 'No skill invocations match the current filters.',
  heading: 'Skill usage',
  intro: (rangeDays: number): string =>
    `Harness-captured Skill invocations over the last ${rangeDays} days — ours (skills/) and third-party (plugin-namespaced) alike. Args are truncated at capture; this view never expands them. Outcome and duration are reported by the skill itself; the automatic session-end hooks report neither, so an em dash means nobody measured it.`,
  leaderboardHeading: 'Top skills',
  /**
   * The de-emphasized second table. Shared by /skills and /usage: both routes
   * render the identical section, so the wording lives here rather than being
   * duplicated into the skills copy file.
   */
  missingHeading: 'No longer on disk',
  missingIntro: `These skills have recorded history but no SKILL.md in this checkout — they were removed, renamed, or moved. Their counts are kept as history; they are ranked separately because you can no longer invoke them.`,
  outcomesColumn: 'Outcomes',
  outcomesHint: `Outcomes count only what a skill reports about its own work (success / error). A session ending cleanly is not an outcome — it says the process finished, not that the skill helped — so it is tracked separately and never counted here. An em dash means nothing was measured, which is the normal state for any skill that does not report.`,
  overTimeHeading: 'Usage over time',
  scopeOursHint: 'Authored under skills/ (and synced into .agents/skills).',
  scopeSplitHeading: 'Ours vs third-party',
  scopeThirdPartyHint: `Plugin-namespaced or otherwise not under skills/ (e.g. vercel:deploy).`,
} as const;
