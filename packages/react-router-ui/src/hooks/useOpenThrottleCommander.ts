import * as React from 'react';

import type { CommanderItem } from '../components/OpenThrottleCommander';

export interface UseOpenThrottleCommanderOptions {
  /** Uncontrolled: initial open state when open/onOpenChange are not provided. */
  readonly defaultOpen?: boolean;
  /** @see OpenThrottleCommanderProps.emptyStateExtras */
  readonly emptyStateExtras?: (query: string) => readonly CommanderItem[];
  /** @see OpenThrottleCommanderProps.onEmptyStateSearch */
  readonly onEmptyStateSearch?: (query: string) => void;
  /** Controlled: called when dialog open state changes. */
  readonly onOpenChange?: (open: boolean) => void;
  /** Controlled: when set, open state is controlled by parent. */
  readonly open?: boolean;
}

export interface UseOpenThrottleCommanderResult {
  /** Empty-state extras flagged `isFallback`: rendered after the Search row. */
  readonly fallbackExtraItems: readonly CommanderItem[];
  readonly handleEmptyStateSearch: () => void;
  readonly handleSelect: (item: CommanderItem) => void;
  /** Controlled cmdk `value` (the highlighted row); pass to `Command`. */
  readonly highlighted: string;
  /** Empty-state extras that are real matches (e.g. a resolved id): rendered before the Search row. */
  readonly leadingExtraItems: readonly CommanderItem[];
  readonly open: boolean;
  readonly search: string;
  /** cmdk value of the "Search for …" row. */
  readonly searchRowValue: string;
  /** cmdk `onValueChange`: arrow keys, pointer and cmdk's own filter reset. */
  readonly setHighlighted: (value: string) => void;
  readonly setOpen: (value: boolean) => void;
  readonly setSearch: (value: string) => void;
  readonly showEmptyEscapeHatch: boolean;
  readonly trimmedSearch: string;
}

/**
 * @description Open/search state, ⌘K + Escape wiring, and empty-state escape
 * hatches for {@link ../components/OpenThrottleCommander.tsx}. Hoisted out of
 * the component per component-primitive-shape R7.
 */
export const useOpenThrottleCommander = (
  options: UseOpenThrottleCommanderOptions,
): UseOpenThrottleCommanderResult => {
  const {
    defaultOpen = false,
    emptyStateExtras,
    onEmptyStateSearch,
    onOpenChange,
    open: openProp,
  } = options;

  // Hooks
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [search, setSearch] = React.useState('');
  const [highlighted, setHighlighted] = React.useState('');

  // Setup
  const isControlled = openProp !== undefined && onOpenChange !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setControlledOpen = (value: boolean): void => {
    onOpenChange?.(value);
  };
  const setOpen = isControlled ? setControlledOpen : setInternalOpen;

  const trimmedSearch = search.trim();
  const canExtend = trimmedSearch.length > 0 && emptyStateExtras != null;
  const extraItems = canExtend ? emptyStateExtras(trimmedSearch) : [];

  const showSearchEscape =
    Boolean(onEmptyStateSearch) && trimmedSearch.length > 0;
  const showUuidExtras = trimmedSearch.length > 0 && extraItems.length > 0;
  const showEmptyEscapeHatch = showSearchEscape || showUuidExtras;
  const leadingExtraItems = extraItems.filter((item) => {
    return item.isFallback !== true;
  });
  const fallbackExtraItems = extraItems.filter((item) => {
    return item.isFallback === true;
  });
  const searchRowValue = `__empty_state_search__ ${trimmedSearch}`;
  const firstLeading = leadingExtraItems[0];
  const firstLeadingValue = (firstLeading?.value ?? firstLeading?.id)?.trim();

  // Handlers
  const handleSelect = React.useCallback(
    (item: CommanderItem) => {
      item.onSelect?.();
      setOpen(false);
    },
    [setOpen],
  );

  const handleEmptyStateSearch = React.useCallback((): void => {
    const trimmed = search.trim();
    if (trimmed && onEmptyStateSearch) {
      onEmptyStateSearch(trimmed);
      setOpen(false);
    }
  }, [onEmptyStateSearch, search, setOpen]);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (open) {
      setSearch('');
    }
  }, [open]);

  // Leading extras (e.g. resolved id rows) arrive after an async lookup, and
  // cmdk only auto-selects a newly mounted item when nothing is selected — so
  // without this Enter does nothing. Re-target only when the first leading
  // extra changes (a new result set), so a row the user arrowed to keeps the
  // highlight. Fallback extras never re-target: they sit below the Search row,
  // which cmdk's filter reset already highlights when nothing else matches.
  React.useEffect(() => {
    if (firstLeadingValue) {
      setHighlighted(firstLeadingValue);
    }
  }, [firstLeadingValue]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        return;
      }

      if (open && e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  // 🔌 Short Circuit

  return {
    fallbackExtraItems,
    handleEmptyStateSearch,
    handleSelect,
    highlighted,
    leadingExtraItems,
    open,
    search,
    searchRowValue,
    setHighlighted,
    setOpen,
    setSearch,
    showEmptyEscapeHatch,
    trimmedSearch,
  };
};
