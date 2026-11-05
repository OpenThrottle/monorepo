export interface OpenAutocomplete {
  readonly activeIndex: number;
  readonly listboxId: string;
  readonly optionId: (index: number) => string;
  readonly results: readonly unknown[];
}

export interface AutocompleteCandidate extends OpenAutocomplete {
  readonly popoverOpen: boolean;
}

/**
 * @description The autocomplete machine whose popover is open, if any. At most
 * one is ever open, so mentions win only by being checked first.
 */
export const pickOpenAutocomplete = (
  mentions: AutocompleteCandidate,
  slash: AutocompleteCandidate,
): OpenAutocomplete | null => {
  if (mentions.popoverOpen) {
    return mentions;
  }

  if (slash.popoverOpen) {
    return slash;
  }

  return null;
};

/**
 * @description The DOM id of the highlighted option, or `undefined` when no
 * popover is open or it has no results.
 */
export const getActiveDescendant = (
  open: OpenAutocomplete | null,
): string | undefined => {
  if (open === null || open.results.length === 0) {
    return undefined;
  }

  return open.optionId(open.activeIndex);
};
