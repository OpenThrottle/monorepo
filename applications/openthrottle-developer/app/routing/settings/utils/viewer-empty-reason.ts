export type ViewerEmptyReason =
  'empty-buffer' | 'levels-none' | 'no-match' | 'none';

export interface ViewerEmptyReasonInput {
  readonly entryCount: number;
  readonly filteredCount: number;
  readonly levelsDisabled: boolean;
}

/**
 * @description Why the log viewer shows nothing, checked in order: no entries captured at all,
 * every level toggled off, then the search/level filters matching nothing.
 */
export const getViewerEmptyReason = (
  input: ViewerEmptyReasonInput,
): ViewerEmptyReason => {
  if (input.entryCount === 0) {
    return 'empty-buffer';
  }
  if (input.levelsDisabled) {
    return 'levels-none';
  }
  if (input.filteredCount === 0) {
    return 'no-match';
  }
  return 'none';
};
