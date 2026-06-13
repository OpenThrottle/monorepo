import * as React from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@openthrottle/react-router-shadcn';

/**
 * Single command palette item: action (onSelect) or navigation (href).
 * At least one of onSelect or href should be set for the item to be actionable.
 */
export interface CommanderItem {
  readonly href?: string;
  readonly icon?: React.ReactNode;
  readonly id: string;
  readonly label: string;
  readonly onSelect?: () => void;
  readonly shortcut?: string;
  /**
   * Optional cmdk filter value; defaults to {@link CommanderItem.id}. Include user-typed text (e.g. a pasted UUID) so items stay visible while filtering.
   */
  readonly value?: string;
}

/**
 * Group of commander items with a heading (e.g. "Navigation", "Actions").
 */
export interface CommanderGroup {
  readonly heading: string;
  readonly items: readonly CommanderItem[];
}

/**
 * Controlled open state (open + onOpenChange) or uncontrolled (defaultOpen with internal state).
 */
export interface OpenThrottleCommanderProps {
  readonly className?: string;
  /** Uncontrolled: initial open state when open/onOpenChange are not provided. */
  readonly defaultOpen?: boolean;
  /**
   * When the query matches nothing in `groups`, extra items (e.g. UUID debug jumps) rendered with "Search for …".
   * Set `value` on each item to include the typed query so cmdk filtering keeps rows visible.
   */
  readonly emptyStateExtras?: (query: string) => readonly CommanderItem[];
  /**
   * Replaces the default empty state when no commands match and there are no UUID/search extras.
   */
  readonly emptyStateMessage?: React.ReactNode;
  /**
   * Optional left-aligned hint in the dialog footer (e.g. UUID / queue-job paste behavior).
   */
  readonly footerHint?: string;
  readonly groups: readonly CommanderGroup[];
  /**
   * When provided and the user has typed a query with no matching items, a "Search for [query]" option is shown in the empty state. Called when the user selects that option.
   */
  readonly onEmptyStateSearch?: (query: string) => void;
  /** Controlled: called when dialog open state changes. */
  readonly onOpenChange?: (open: boolean) => void;
  /** Controlled: when set, open state is controlled by parent. */
  readonly open?: boolean;
  readonly placeholder?: string;
}

export const OpenThrottleCommander = (
  props: OpenThrottleCommanderProps,
): React.ReactElement => {
  const {
    className,
    defaultOpen = false,
    emptyStateExtras,
    groups,
    onEmptyStateSearch,
    onOpenChange: onOpenChangeProp,
    open: openProp,
    placeholder = 'Type a command or search...',
    footerHint,
    emptyStateMessage,
  } = props;

  // Hooks
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [search, setSearch] = React.useState('');
  const isControlled = openProp !== undefined && onOpenChangeProp !== undefined;

  // Setup
  const open = isControlled ? openProp : internalOpen;
  const setOpen = isControlled
    ? (value: boolean) => onOpenChangeProp?.(value)
    : setInternalOpen;

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

  const trimmedSearch = search.trim();
  const extraItems =
    trimmedSearch.length > 0 && emptyStateExtras != null
      ? emptyStateExtras(trimmedSearch)
      : [];

  const showSearchEscape =
    Boolean(onEmptyStateSearch) && trimmedSearch.length > 0;
  const showUuidExtras = trimmedSearch.length > 0 && extraItems.length > 0;
  const showEmptyEscapeHatch = showSearchEscape || showUuidExtras;

  return (
    <CommandDialog
      className={className}
      data-testid="OpenThrottleCommander"
      modal={true}
      onOpenChange={setOpen}
      open={open}
      translate="no"
    >
      <CommandInput
        className="border-border! flex-1 border-b! p-4 pb-4 text-sm! leading-none"
        onValueChange={setSearch}
        placeholder={placeholder}
        value={search}
      />

      <CommandList className="visormatt-testing m-0! p-0! pt-4!">
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group.heading}>
            {groupIndex > 0 ? (
              <CommandSeparator className="my-4 px-4!" />
            ) : null}
            <CommandGroup
              className="visormatt-testing m-0! p-0!"
              heading={group.heading}
            >
              {group.items.map((item) => (
                <CommandItem
                  className="m-0! h-auto! rounded-none! p-2! px-4!"
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  value={item.value ?? item.id}
                >
                  {item.icon ?? null}
                  <span>{item.label}</span>
                  {item.shortcut ? (
                    <CommandShortcut className="w-auto whitespace-nowrap">
                      {item.shortcut}
                    </CommandShortcut>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}

        {showEmptyEscapeHatch ? (
          <CommandGroup
            forceMount={true}
            heading={
              extraItems.length > 0
                ? 'No match in palette — open a route or search'
                : 'No matching commands — try search'
            }
          >
            {extraItems.map((item) => (
              <CommandItem
                forceMount={true}
                key={item.id}
                onSelect={() => handleSelect(item)}
                value={item.value ?? item.id}
              >
                {item.icon ?? null}
                <span>{item.label}</span>
                {item.shortcut ? (
                  <CommandShortcut className="w-auto whitespace-nowrap">
                    {item.shortcut}
                  </CommandShortcut>
                ) : null}
              </CommandItem>
            ))}
            {onEmptyStateSearch ? (
              <CommandItem
                forceMount={true}
                onSelect={handleEmptyStateSearch}
                value={`__empty_state_search__ ${trimmedSearch}`}
              >
                Search for &quot;{trimmedSearch}&quot;
              </CommandItem>
            ) : null}
          </CommandGroup>
        ) : (
          <CommandEmpty data-testid="OpenThrottleCommander-empty">
            {emptyStateMessage ?? (
              <>
                No matching commands. Type to filter, or paste a UUID /
                queueId/jobId when nothing matches.
              </>
            )}
          </CommandEmpty>
        )}
      </CommandList>

      <div className="border-border text-muted-foreground flex items-center justify-between gap-4 border-t px-2 py-2 text-[10px]">
        {footerHint ? (
          <span className="line-clamp-2 max-w-[min(100%,18rem)] text-left leading-snug">
            {footerHint}
          </span>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center justify-end gap-4">
          <div className="flex items-center gap-1.5">
            <CommandShortcut className="border-muted-foreground flex w-auto items-center border text-[8px]! whitespace-nowrap">
              ↑↓
            </CommandShortcut>
            <span className="font-regular">navigate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CommandShortcut className="border-muted-foreground flex w-auto items-center border text-[8px]! whitespace-nowrap">
              ↵
            </CommandShortcut>
            <span className="font-regular">select</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CommandShortcut className="border-muted-foreground flex w-auto items-center border text-[8px]! whitespace-nowrap">
              esc
            </CommandShortcut>
            <span className="font-regular">close</span>
          </div>
        </div>
      </div>
    </CommandDialog>
  );
};
