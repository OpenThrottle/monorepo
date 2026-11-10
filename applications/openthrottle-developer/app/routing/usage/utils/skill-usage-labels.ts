import {
  SKILL_USAGE_COPY,
  SKILL_USAGE_SCOPE_BADGE_COLORS,
  SKILL_USAGE_SCOPES,
} from '~/routing/usage/data/data.skill-usage-copy';

/** Human label for a scope id. */
export const skillUsageScopeLabel = (scope: string): string => {
  if (scope === SKILL_USAGE_SCOPES.INJECTED) return 'Injected';
  if (scope === SKILL_USAGE_SCOPES.OURS) return 'Ours';
  if (scope === SKILL_USAGE_SCOPES.PERSONAL) return 'Personal';
  if (scope === SKILL_USAGE_SCOPES.THIRD_PARTY) return 'Third-party';

  return scope;
};

/**
 * Badge colour for a scope id as it arrives from GraphQL (a plain `String`).
 * An unrecognized value falls back to the third-party colour, matching how the
 * server narrows an unknown stored scope — never to `ours`, which would dress
 * an unknown up as one of our own.
 */
export const skillUsageScopeBadgeColor = (
  scope: string,
): 'blue' | 'green' | 'orange' | 'violet' => {
  if (scope === SKILL_USAGE_SCOPES.INJECTED) {
    return SKILL_USAGE_SCOPE_BADGE_COLORS.injected;
  }
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

/**
 * Format avg duration; "Not measured" when no samples.
 *
 * Not measured is the COMMON case by design. Only a deliberate reporter supplies a
 * duration: no harness hook brackets a skill's own work, so the automatic
 * session-end paths report null rather than session-tail length.
 */
export const skillUsageAvgDurationLabel = (
  avgDurationMs: number | null | undefined,
): string => {
  if (avgDurationMs == null) return SKILL_USAGE_COPY.notMeasured;
  if (avgDurationMs < 1000) return `${avgDurationMs}ms`;

  return `${(avgDurationMs / 1000).toFixed(1)}s`;
};

/**
 * Compact outcomes cell: "3/5", or "Not measured" when none reported.
 *
 * `outcomeCount` is QUALITY outcomes only (success + error). Session-end and
 * abandoned records are excluded upstream, so a skill that never reports its own
 * outcome shows as not measured — the honest reading of "nobody measured this", rather than
 * a full score assembled from "the session finished".
 */
export const skillUsageOutcomesLabel = (
  outcomeCount: number,
  startCount: number,
): string => {
  if (outcomeCount <= 0) return SKILL_USAGE_COPY.notMeasured;

  return `${outcomeCount}/${startCount}`;
};
