/**
 * @description A fragment that can be added as a child: enough to name it in a picker.
 */
export interface FragmentChildCandidate {
  readonly name: string;
  readonly typename: string;
  readonly uuid: string;
}

/**
 * @description The child picker's state: the current page of candidates, under the active
 * typename filter, and the typenames a new child can be created as.
 */
export interface FragmentChildPicker {
  readonly candidates: readonly FragmentChildCandidate[];
  readonly hasNextPage: boolean;
  /** Zero-based. */
  readonly page: number;
  /** The typename filter, or `null` for every type. */
  readonly typename: string | null;
  /** Typenames with an ACTIVE schema, sorted: what a new child can be created as. */
  readonly typenames: readonly string[];
}

/**
 * @description The picker's filter and page, as read from the URL.
 */
export interface FragmentChildPickerQuery {
  readonly page: number;
  readonly typename: string | null;
}
