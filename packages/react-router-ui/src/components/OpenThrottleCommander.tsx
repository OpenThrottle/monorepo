import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandSeparator,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { COMMANDER_CLASS_NAME } from '../data/commander';
import { useOpenThrottleCommander } from '../hooks/useOpenThrottleCommander';
import { getCommanderEscapeHeading } from '../utils/getCommanderEscapeHeading';
import { scoreCommanderRow } from '../utils/scoreCommanderRow';
import { CommanderFooter } from './CommanderFooter';
import { CommanderItemRow } from './CommanderItemRow';
import { CommanderNoMatchGroup } from './CommanderNoMatchGroup';

/** Single command palette item: action (onSelect) or navigation (href). At least one of onSelect or href should be set for the item to be actionable. */
export interface CommanderItem {
  readonly href?: string;
  readonly icon?: React.ReactNode;
  readonly id: string;
  /**
   * Empty-state extras only: a generic escape (e.g. "browse all") rather than a
   * match for the query. Fallback rows render after "Search for …", so Search
   * leads — and is highlighted — when nothing actually matched.
   */
  readonly isFallback?: boolean;
  readonly label: string;
  readonly onSelect?: () => void;
  readonly shortcut?: string;
  /** Right-aligned node after the label (e.g. a status badge); the label wraps to make room. */
  readonly trailing?: React.ReactNode;
  /**
   * Optional cmdk filter value; defaults to {@link CommanderItem.id}. Include user-typed text (e.g. a pasted UUID) so items stay visible while filtering.
   */
  readonly value?: string;
}

/** Group of commander items with a heading (e.g. "Navigation", "Actions"). */
export interface CommanderGroup {
  readonly heading: string;
  readonly items: readonly CommanderItem[];
}

/** Controlled open state (open + onOpenChange) or uncontrolled (defaultOpen with internal state). */
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
  /** Notified with the live palette query on every keystroke (e.g. to drive a debounced id-prefix resolver). */
  readonly onSearchChange?: (query: string) => void;
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
    onSearchChange,
    open: openProp,
    placeholder = 'Type a command or search...',
    footerHint,
    emptyStateMessage,
  } = props;

  // Hooks
  const {
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
  } = useOpenThrottleCommander({
    defaultOpen,
    emptyStateExtras,
    onEmptyStateSearch,
    onOpenChange: onOpenChangeProp,
    open: openProp,
  });

  // Setup
  const escapeHeading = getCommanderEscapeHeading({
    groups,
    hasExtras: leadingExtraItems.length + fallbackExtraItems.length > 0,
    search: trimmedSearch,
  });

  // Handlers

  // Markup
  const escapeHatch = (
    <CommanderNoMatchGroup
      fallbackItems={fallbackExtraItems}
      heading={escapeHeading}
      leadingItems={leadingExtraItems}
      onSearch={onEmptyStateSearch && handleEmptyStateSearch}
      onSelect={handleSelect}
      search={trimmedSearch}
      searchValue={searchRowValue}
    />
  );
  const emptyState = (
    <CommandEmpty data-testid="OpenThrottleCommander-empty">
      {emptyStateMessage ?? (
        <>
          No matching commands. Type to filter, or paste a UUID / queueId/jobId
          when nothing matches.
        </>
      )}
    </CommandEmpty>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CommandDialog
      className={className}
      data-testid="OpenThrottleCommander"
      filter={scoreCommanderRow}
      modal={true}
      onOpenChange={setOpen}
      onValueChange={setHighlighted}
      open={open}
      translate="no"
      value={highlighted}
    >
      <CommandInput
        className="border-border! flex-1 border-b! p-4 pb-4 text-sm! leading-none"
        onValueChange={(value) => {
          setSearch(value);
          onSearchChange?.(value);
        }}
        placeholder={placeholder}
        value={search}
      />

      <CommandList className="m-0! p-0! pt-4!">
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group.heading}>
            {groupIndex > 0 ? (
              <CommandSeparator className="my-4 px-4!" />
            ) : null}
            <CommandGroup
              className={COMMANDER_CLASS_NAME.group}
              heading={group.heading}
            >
              {group.items.map((item) => (
                <CommanderItemRow
                  className={COMMANDER_CLASS_NAME.row}
                  forceMount={undefined}
                  item={item}
                  key={item.id}
                  keywords={undefined}
                  onSelect={handleSelect}
                />
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}

        {showEmptyEscapeHatch ? escapeHatch : emptyState}
      </CommandList>

      <CommanderFooter footerHint={footerHint} />
    </CommandDialog>
  );
};
