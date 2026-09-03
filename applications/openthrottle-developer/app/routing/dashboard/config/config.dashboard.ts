export const GITHUB_ORGS = [
  'openthrottle',
  'shiftsmartinc',
  'visormatt',
] as const;

export type GithubOrg = (typeof GITHUB_ORGS)[number];
export type GithubRepo = (typeof GITHUB_REPOSITORIES)[GithubOrg][number];

export const GITHUB_REPOSITORIES: Record<GithubOrg, string[]> = {
  openthrottle: ['monorepo', 'openthrottle'],
  shiftsmartinc: [
    'monorepo',
    'native-apps',
    'nativeapps',
    'shiftsmart-helm-charts',
  ],
  visormatt: ['monorepo'],
};

// Day windows for the shared `dailyStatsRange` fetch. The loader fetches the
// wider CONTRIBUTIONS window (feeds the contributions heatmap); the "This
// Week's Activity" bar chart slices the most-recent days off the same result,
// so both share one round-trip (items come back date-ascending). Widen the
// heatmap by bumping CONTRIBUTIONS_DAYS_BACK — no schema/codegen change, the
// start/end are query variables on the existing dailyStatsRange field.
export const CONTRIBUTIONS_DAYS_BACK = 26 * 7 + 7; // 26-week grid + week-alignment slack
export const WEEKLY_ACTIVITY_DAYS = 7;
