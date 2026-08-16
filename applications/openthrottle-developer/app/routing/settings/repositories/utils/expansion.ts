import type { ExpandedState } from '@tanstack/react-table';

/**
 * @description Turn the parent row ids reported by `filterRepositoryRows` into
 * the `ExpandedState` shape TanStack Table expects, so a search that matched
 * only a worktree opens that group instead of leaving it collapsed.
 */
export const toExpandedState = (rowIds: string[]): ExpandedState =>
  Object.fromEntries(rowIds.map((rowId) => [rowId, true]));
