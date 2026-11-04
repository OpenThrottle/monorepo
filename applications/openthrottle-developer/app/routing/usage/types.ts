/**
 * @description Shared types for the usage routing area. Hook-adjacent shapes
 * that used to be exported from `hooks/` files live here (hook-primitive-shape
 * H2).
 */

/** One selectable branch with its invocation count. */
export interface UsageBranchOption {
  readonly branch: string;
  readonly count: number;
}

/**
 * Payload the branch resource route returns. `query` echoes the normalized
 * search the items were resolved for, so a stale keystroke's response can be
 * discarded instead of flickering into the list.
 */
export interface UsageBranchSearchData {
  readonly hasMore: boolean;
  readonly items: readonly UsageBranchOption[];
  readonly query: string;
}
