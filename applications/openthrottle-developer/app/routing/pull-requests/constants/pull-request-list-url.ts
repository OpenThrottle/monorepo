/**
 * @description Search param on `/pull-requests` that opens the preview sheet (GitHub PR number).
 */
export const PULL_REQUEST_LIST_PREVIEW_SEARCH_PARAM = 'pr' as const;

/**
 * @description Parses `pr` for the pull-requests list route; returns null if missing or invalid.
 */
export const parsePullRequestListPreviewNumber = (
  raw: string | null,
): number | null => {
  if (raw === null || raw.trim() === '') {
    return null;
  }

  const parsed = Number.parseInt(raw, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

/**
 * @description Merges the list filter query with a preview selection for deep links and in-app navigation.
 */
export const buildPullRequestListSearchWithPreview = (
  listQuery: string,
  prNumber: number,
): string => {
  const params = new URLSearchParams(listQuery);

  params.set(PULL_REQUEST_LIST_PREVIEW_SEARCH_PARAM, String(prNumber));

  return params.toString();
};
