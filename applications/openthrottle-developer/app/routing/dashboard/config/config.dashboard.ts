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
