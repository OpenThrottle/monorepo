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
  readonly extraItems: readonly CommanderItem[];
  readonly handleEmptyStateSearch: () => void;
  readonly handleSelect: (item: CommanderItem) => void;
  readonly open: boolean;
  readonly search: string;
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

  // Setup
  const isControlled = openProp !== undefined && onOpenChange !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled
    ? (value: boolean) => onOpenChange?.(value)
    : setInternalOpen;

  const trimmedSearch = search.trim();
  const extraItems =
    trimmedSearch.length > 0 && emptyStateExtras != null
      ? emptyStateExtras(trimmedSearch)
      : [];

  const showSearchEscape =
    Boolean(onEmptyStateSearch) && trimmedSearch.length > 0;
  const showUuidExtras = trimmedSearch.length > 0 && extraItems.length > 0;
  const showEmptyEscapeHatch = showSearchEscape || showUuidExtras;

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
    extraItems,
    handleEmptyStateSearch,
    handleSelect,
    open,
    search,
    setOpen,
    setSearch,
    showEmptyEscapeHatch,
    trimmedSearch,
  };
};
