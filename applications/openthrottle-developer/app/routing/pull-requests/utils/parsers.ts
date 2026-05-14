/**
 * @description And example parser...
 * Build what we need and add them in here as simple testable functions.
 */
export const parsePullRequestsDate = (value: string) => {
  return value;
};

export const parsePullListState = (
  raw: string | null,
): 'all' | 'closed' | 'open' => {
  if (raw === 'all' || raw === 'closed') {
    return raw;
  }

  return 'open';
};
