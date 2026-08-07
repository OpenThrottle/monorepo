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

/** Format avg duration for the leaderboard; em dash when no samples. */
export const skillUsageAvgDurationLabel = (
  avgDurationMs: number | null | undefined,
): string => {
  if (avgDurationMs == null) return '—';
  if (avgDurationMs < 1000) return `${avgDurationMs}ms`;
  return `${(avgDurationMs / 1000).toFixed(1)}s`;
};

/** Compact outcomes cell: "3/5" or em dash when none reported. */
export const skillUsageOutcomesLabel = (
  outcomeCount: number,
  startCount: number,
): string => {
  if (outcomeCount <= 0) return '—';
  return `${outcomeCount}/${startCount}`;
};

export const SKILL_USAGE_COPY = {
  avgDurationColumn: 'Avg duration',
  empty:
    'No skill invocations recorded yet in this range. Usage is captured by the harness PreToolUse hook when a Skill tool runs.',
  emptyFiltered: 'No skill invocations match the current filters.',
  heading: 'Skill usage',
  intro: (rangeDays: number): string =>
    `Harness-captured Skill invocations over the last ${rangeDays} days — ours (skills/) and third-party (plugin-namespaced) alike. Args are truncated at capture; this view never expands them. Outcome/duration columns are opt-in enrichment for skills we author; missing outcomes are normal.`,
  leaderboardHeading: 'Top skills',
  outcomesColumn: 'Outcomes',
  overTimeHeading: 'Usage over time',
  scopeOursHint: 'Authored under skills/ (and synced into .agents/skills).',
  scopeSplitHeading: 'Ours vs third-party',
  scopeThirdPartyHint:
    'Plugin-namespaced or otherwise not under skills/ (e.g. vercel:deploy).',
} as const;
