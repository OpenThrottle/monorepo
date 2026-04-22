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
  readonly groups: readonly CommanderGroup[];
  /**
   * When provided and the user has typed a query with no matching items, a "Search for [query]" option is shown in the empty state. Called when the user selects that option.
   */
  readonly onEmptyStateSearch?: (query: string) => void;
  /** Controlled: when set, open state is controlled by parent. */
  readonly open?: boolean;
  /** Controlled: called when dialog open state changes. */
  readonly onOpenChange?: (open: boolean) => void;
  readonly placeholder?: string;
}

export const OpenThrottleCommander = (props: OpenThrottleCommanderProps) => {
  const {
    className,
    defaultOpen = false,
    groups,
    onEmptyStateSearch,
    onOpenChange: onOpenChangeProp,
    open: openProp,
    placeholder = 'Type a command or search...',
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

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey === true || e.ctrlKey === true)) {
        e.preventDefault();
        setInternalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  console.log('open', open, groups);

  // 🔌 Short Circuit

  const showEmptyStateSearch =
    Boolean(onEmptyStateSearch) && search.trim().length > 0;

  return (
    <CommandDialog
      className={className}
      modal={true}
      onOpenChange={setOpen}
      open={open}
      translate="no"
    >
      <CommandInput
        className="p-4 flex-1 leading-none text-sm! pb-4 border-b! border-border!"
        onValueChange={setSearch}
        placeholder={placeholder}
        value={search}
      />

      <CommandList className="visormatt-testing m-0! p-0! pt-4!">
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group.heading}>
            {groupIndex > 0 ? (
              <CommandSeparator className="px-4! my-4" />
            ) : null}
            <CommandGroup
              className="visormatt-testing m-0! p-0!"
              heading={group.heading}
            >
              {group.items.map((item) => (
                <CommandItem
                  className="rounded-none! p-2! px-4! m-0! h-auto!"
                  key={item.id}
                  onSelect={() => handleSelect(item)}
                  value={item.id}
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

        {showEmptyStateSearch ? (
          <CommandGroup forceMount={true} heading="No results found.">
            <CommandItem
              forceMount={true}
              onSelect={handleEmptyStateSearch}
              value="__empty_state_search__"
            >
              Search for &quot;{search.trim()}&quot;
            </CommandItem>
          </CommandGroup>
        ) : (
          <CommandEmpty>No results found.</CommandEmpty>
        )}
      </CommandList>

      <div className="text-[10px] px-2 py-2 border-t border-border text-muted-foreground gap-4 flex justify-end items-center">
        <div className="gap-1.5 flex items-center">
          <CommandShortcut className="w-auto whitespace-nowrap border border-muted-foreground items-center flex text-[8px]! ">
            ↑↓
          </CommandShortcut>
          <span className="font-regular">navigate</span>
        </div>
        <div className="gap-1.5 flex items-center">
          <CommandShortcut className="w-auto whitespace-nowrap border border-muted-foreground items-center flex text-[8px]! ">
            ↵
          </CommandShortcut>
          <span className="font-regular">select</span>
        </div>
        <div className="gap-1.5 flex items-center">
          <CommandShortcut className="w-auto whitespace-nowrap border border-muted-foreground items-center flex text-[8px]! ">
            esc
          </CommandShortcut>
          <span className="font-regular">close</span>
        </div>
      </div>
    </CommandDialog>
  );
};
