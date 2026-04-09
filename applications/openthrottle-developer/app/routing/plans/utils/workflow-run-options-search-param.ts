/**
 * @description URL query for plan detail: expanded workflow run options panel. Omitted = collapsed (default); `1` = expanded (matches boolean-style flags elsewhere).
 */
export const WORKFLOW_RUN_OPTIONS_SEARCH_PARAM = 'runOptions' as const;

export const WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE = '1' as const;

/**
 * @description Whether the workflow run options card is expanded from the plan detail URL.
 */
export const isWorkflowRunOptionsExpandedFromSearchParams = (
  searchParams: URLSearchParams,
): boolean =>
  searchParams.get(WORKFLOW_RUN_OPTIONS_SEARCH_PARAM) ===
  WORKFLOW_RUN_OPTIONS_EXPANDED_VALUE;
