/**
 * Branches pinned above the alphabetical tail, most-default first. Expressed as
 * a SQL rank so the pin survives the LIMIT: `main` wins when both are present,
 * `master` is pinned when it is the only one in the window.
 */
export const SKILL_USAGE_DEFAULT_BRANCHES = ['main', 'master'] as const;
