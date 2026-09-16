/**
 * @description Static copy + scope labels for the Usage-route skill-usage
 * surface. Component files stay presentational; labels live here.
 */

/**
 * Who a captured invocation belongs to.
 *
 * DUPLICATED ON PURPOSE. The canonical declaration is `SKILL_USAGE_SCOPES` in
 * `packages/nestjs-repositories/src/modules/skill-usage-events/skill-usage-events.entity.ts`,
 * which the Postgres CHECK follows — but a React Router app must not import
 * from a NestJS package, so the members are restated here. A third copy is the
 * `Scope` union in `packages/agentic-hooks/src/types.ts`, which the capture
 * hooks bundle. Widening this vocabulary means touching all three; that they
 * disagreed is exactly how `personal` ended up rendering as `Third-party`.
 */
export const SKILL_USAGE_SCOPES = {
  OURS: 'ours',
  PERSONAL: 'personal',
  THIRD_PARTY: 'third-party',
} as const;

/** One scope member. */
export type SkillUsageScope =
  (typeof SKILL_USAGE_SCOPES)[keyof typeof SKILL_USAGE_SCOPES];

/** A selected scope, or `null` for "all scopes". */
export type SkillUsageScopeFilter = SkillUsageScope | null;

/** Human label for a scope id. */
export const skillUsageScopeLabel = (scope: string): string => {
  if (scope === SKILL_USAGE_SCOPES.OURS) return 'Ours';
  if (scope === SKILL_USAGE_SCOPES.PERSONAL) return 'Personal';
  if (scope === SKILL_USAGE_SCOPES.THIRD_PARTY) return 'Third-party';

  return scope;
};

/**
 * Badge colour per scope, from the `color` options `Badge` actually supports
 * (see `packages/react-router-shadcn/src/components/Badge.tsx`, whose palette
 * is a documented versioned contract). Deliberately a `Record` over the scope
 * union and not a ternary: the Scope tile used to read
 * `scope === OURS ? 'green' : 'orange'`, so a personal invocation fell through
 * to the third-party colour instead of failing the build. `violet` reads as
 * clearly distinct from both `green` (ours) and `orange` (third-party).
 */
export const SKILL_USAGE_SCOPE_BADGE_COLORS: Record<
  SkillUsageScope,
  'green' | 'orange' | 'violet'
> = {
  ours: 'green',
  personal: 'violet',
  'third-party': 'orange',
};

/**
 * Badge colour for a scope id as it arrives from GraphQL (a plain `String`).
 * An unrecognized value falls back to the third-party colour, matching how the
 * server narrows an unknown stored scope — never to `ours`, which would dress
 * an unknown up as one of our own.
 */
export const skillUsageScopeBadgeColor = (
  scope: string,
): 'green' | 'orange' | 'violet' => {
  if (scope === SKILL_USAGE_SCOPES.OURS) {
    return SKILL_USAGE_SCOPE_BADGE_COLORS.ours;
  }
  if (scope === SKILL_USAGE_SCOPES.PERSONAL) {
    return SKILL_USAGE_SCOPE_BADGE_COLORS.personal;
  }

  return SKILL_USAGE_SCOPE_BADGE_COLORS['third-party'];
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
  empty: `No skill invocations recorded yet in this range. Usage is captured by the harness PreToolUse hook when a Skill tool runs.`,
  emptyFiltered: 'No skill invocations match the current filters.',
  heading: 'Skill usage',
  intro: (rangeDays: number): string =>
    `Harness-captured Skill invocations over the last ${rangeDays} days — ours (skills/), personal (your own, linked in from outside the repo) and third-party (plugin-namespaced) alike. Args are truncated at capture; this view never expands them. Outcome/duration columns are opt-in enrichment for skills we author; missing outcomes are normal.`,
  leaderboardHeading: 'Top skills',
  /**
   * The de-emphasized second table. Shared by /skills and /usage: both routes
   * render the identical section, so the wording lives here rather than being
   * duplicated into the skills copy file.
   */
  missingHeading: 'No longer on disk',
  missingIntro: `These skills have recorded history but no SKILL.md in this checkout — they were removed, renamed, or moved. Their counts are kept as history; they are ranked separately because you can no longer invoke them.`,
  outcomesColumn: 'Outcomes',
  outcomesHint: `Outcome and duration stats are opt-in enrichment for skills we author; missing outcomes are normal.`,
  overTimeHeading: 'Usage over time',
  scopeOursHint: 'Authored under skills/ (and synced into .agents/skills).',
  /**
   * Worded from `SKILL_PRESENCE_TOOLTIPS.personal` so the scope tile and the
   * presence badge describe the same thing in the same terms.
   */
  scopePersonalHint: `On disk and invokable, but linked in from your personal skills directory outside the repo — nobody else's checkout has it.`,
  scopeSplitHeading: 'Scope',
  scopeThirdPartyHint: `Plugin-namespaced or otherwise not under skills/ (e.g. vercel:deploy).`,
} as const;
