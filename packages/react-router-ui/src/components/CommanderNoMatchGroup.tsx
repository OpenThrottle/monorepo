import { CommandGroup, CommandItem } from '@openthrottle/react-router-shadcn';
import { SearchIcon } from 'lucide-react';
import * as React from 'react';

import {
  COMMANDER_CLASS_NAME,
  COMMANDER_ESCAPE_ROW_KEYWORD,
} from '../data/data.commander';
import { CommanderItemRow } from './CommanderItemRow';
import type { CommanderItem } from './OpenThrottleCommander';

export interface CommanderNoMatchGroupProps {
  /** Extras flagged `isFallback` (e.g. "browse all"): rendered after Search. */
  readonly fallbackItems: readonly CommanderItem[];
  readonly heading: string;
  /** Extras that match the query (e.g. a resolved id): rendered before Search. */
  readonly leadingItems: readonly CommanderItem[];
  /** Runs the "Search for …" row; `undefined` hides that row. */
  readonly onSearch: (() => void) | undefined;
  readonly onSelect: (item: CommanderItem) => void;
  /** Trimmed query, shown in the "Search for …" label. */
  readonly search: string;
  /** cmdk value of the "Search for …" row. */
  readonly searchValue: string;
}

/**
 * @description The palette's escape-hatch group: leading extras, then
 * "Search for …", then fallback extras. Each row carries a
 * {@link COMMANDER_ESCAPE_ROW_KEYWORD} so `scoreCommanderRow` keeps that order
 * through cmdk's score sort.
 */
export const CommanderNoMatchGroup = (
  props: CommanderNoMatchGroupProps,
): React.ReactElement => {
  const {
    fallbackItems,
    heading,
    leadingItems,
    onSearch,
    onSelect,
    search,
    searchValue,
  } = props;

  // Hooks

  // Setup
  const renderRow = (
    item: CommanderItem,
    keyword: string,
  ): React.ReactElement => {
    return (
      <CommanderItemRow
        className={COMMANDER_CLASS_NAME.row}
        forceMount={true}
        item={item}
        key={item.id}
        keywords={[keyword]}
        onSelect={onSelect}
      />
    );
  };

  // Handlers

  // Markup
  const searchRow = onSearch && (
    <CommandItem
      className={COMMANDER_CLASS_NAME.row}
      data-testid="OpenThrottleCommander-search"
      forceMount={true}
      keywords={[COMMANDER_ESCAPE_ROW_KEYWORD.search]}
      onSelect={onSearch}
      value={searchValue}
    >
      <SearchIcon aria-hidden={true} className={COMMANDER_CLASS_NAME.icon} />
      <span>Search for &quot;{search}&quot;</span>
    </CommandItem>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CommandGroup
      className={COMMANDER_CLASS_NAME.group}
      data-testid="CommanderNoMatchGroup"
      forceMount={true}
      heading={heading}
    >
      {leadingItems.map((item) => {
        return renderRow(item, COMMANDER_ESCAPE_ROW_KEYWORD.leading);
      })}
      {searchRow}
      {fallbackItems.map((item) => {
        return renderRow(item, COMMANDER_ESCAPE_ROW_KEYWORD.fallback);
      })}
    </CommandGroup>
  );
};
