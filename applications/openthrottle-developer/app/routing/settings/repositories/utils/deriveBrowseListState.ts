export type BrowseListState = 'empty' | 'entries' | 'error' | 'loading';

export interface BrowseListStateInput {
  readonly browseError: string | null;
  readonly entryCount: number;
  readonly isBrowsing: boolean;
}

/**
 * @description Which body the in-app picker shows below its toolbar. A pending
 * browse wins over an error, and an error wins over an empty listing.
 */
export const deriveBrowseListState = (
  input: BrowseListStateInput,
): BrowseListState => {
  if (input.isBrowsing) {
    return 'loading';
  }

  if (input.browseError) {
    return 'error';
  }

  if (input.entryCount === 0) {
    return 'empty';
  }

  return 'entries';
};
