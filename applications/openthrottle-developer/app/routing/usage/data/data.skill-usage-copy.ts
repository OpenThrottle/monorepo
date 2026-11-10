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
  INJECTED: 'injected',
  OURS: 'ours',
  PERSONAL: 'personal',
  THIRD_PARTY: 'third-party',
} as const;

/** One scope member. */
export type SkillUsageScope =
  (typeof SKILL_USAGE_SCOPES)[keyof typeof SKILL_USAGE_SCOPES];

/** A selected scope, or `null` for "all scopes". */
export type SkillUsageScopeFilter = SkillUsageScope | null;

/**
 * Badge colour per scope, from the `color` options `Badge` actually supports
 * (see `packages/react-router-shadcn/src/components/Badge.tsx`, whose palette
 * is a documented versioned contract). Deliberately a `Record` over the scope
 * union and not a ternary: the Scope tile used to read
 * `scope === OURS ? 'green' : 'orange'`, so a personal invocation fell through
 * to the third-party colour instead of failing the build. `violet` (personal)
 * and `blue` (injected) read as clearly distinct from `green` (ours) and
 * `orange` (third-party).
 */
export const SKILL_USAGE_SCOPE_BADGE_COLORS: Record<
  SkillUsageScope,
  'blue' | 'green' | 'orange' | 'violet'
> = {
  injected: 'blue',
  ours: 'green',
  personal: 'violet',
  'third-party': 'orange',
};

/**
 * The scope doc that explains why outcome and duration are usually unmeasured
 * ("The outcome model" and "duration_ms is null on every automatic path").
 */
export const SKILL_USAGE_TELEMETRY_SCOPE_DOC_HREF = `https://github.com/OpenThrottle/monorepo/blob/main/docs/monorepo/skill-usage-telemetry-scope.md`;

export const SKILL_USAGE_COPY = {
  avgDurationColumn: 'Avg duration',
  empty: `No skill invocations recorded yet in this range. Usage is captured by the harness PreToolUse hook when a Skill tool runs.`,
  emptyFiltered: 'No skill invocations match the current filters.',
  heading: 'Skill usage',
  intro: (rangeDays: number): string =>
    `Harness-captured Skill invocations over the last ${rangeDays} days — ours (skills/), injected (OpenThrottle skills linked into another workspace), personal (your own, linked in from outside the repo) and third-party (plugin-namespaced) alike. Args are truncated at capture; this view never expands them. Outcome and duration are reported by the skill itself; the automatic session-end hooks report neither, so "Not measured" means nobody reported it.`,
  leaderboardHeading: 'Top skills',
  /**
   * The de-emphasized second table. Shared by /skills and /usage: both routes
   * render the identical section, so the wording lives here rather than being
   * duplicated into the skills copy file.
   */
  missingHeading: 'No longer on disk',
  missingIntro: `These skills have recorded history but no SKILL.md in this checkout — they were removed, renamed, or moved. Their counts are kept as history; they are ranked separately because you can no longer invoke them.`,
  notMeasured: 'Not measured',
  notMeasuredDurationTitle: `Not measured: no harness hook brackets a skill's own work, so duration exists only when a skill reports it. Click for the telemetry scope.`,
  notMeasuredOutcomesTitle: `Not measured: this skill never reported a success or error. Click for the telemetry scope.`,
  outcomesColumn: 'Outcomes',
  outcomesHint: `Outcomes count only what a skill reports about its own work (success / error). A session ending cleanly is not an outcome — it says the process finished, not that the skill helped — so it is tracked separately and never counted here. "Not measured" means nothing was reported, which is the normal state for any skill that does not report.`,
  overTimeHeading: 'Usage over time',
  scopeInjectedHint: `OpenThrottle skills authored under another repository's skills/ and linked into this workspace by foreign skill injection.`,
  scopeOursHint: 'Authored under skills/ (and synced into .agents/skills).',
  /**
   * Worded from `SKILL_PRESENCE_TOOLTIPS.personal` so the scope tile and the
   * presence badge describe the same thing in the same terms.
   */
  scopePersonalHint: `On disk and invokable, but linked in from your personal skills directory outside the repo — nobody else's checkout has it.`,
  scopeSplitHeading: 'Scope',
  scopeThirdPartyHint: `Plugin-namespaced or otherwise not under skills/ (e.g. vercel:deploy).`,
} as const;
