import {
  cn,
  CommandItem,
  CommandShortcut,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { CommanderItem } from './OpenThrottleCommander';

export interface CommanderItemRowProps {
  readonly className: string | undefined;
  /** Keep the row mounted even when cmdk's own filter would hide it (empty-state extras). */
  readonly forceMount: boolean | undefined;
  readonly item: CommanderItem;
  /** cmdk keywords; the palette uses them to rank its no-match rows. */
  readonly keywords: readonly string[] | undefined;
  readonly onSelect: (item: CommanderItem) => void;
}

/**
 * @public
 * @description One command-palette row: icon, label, then an optional
 * right-aligned `trailing` node (e.g. a status badge) and keyboard shortcut.
 * With a trailing node the label takes the remaining width and wraps, so a long
 * title never pushes the badge off the row.
 */
export const CommanderItemRow = (
  props: CommanderItemRowProps,
): React.ReactElement => {
  const { className, forceMount, item, keywords, onSelect } = props;

  // Hooks

  // Setup
  const hasTrailing = item.trailing != null;

  // Handlers
  const handleSelect = (): void => {
    onSelect(item);
  };

  // Markup
  const trailing = hasTrailing && (
    <span className="ml-auto shrink-0" data-testid="CommanderItemRow-trailing">
      {item.trailing}
    </span>
  );
  const shortcut = item.shortcut && (
    <CommandShortcut className="w-auto whitespace-nowrap">
      {item.shortcut}
    </CommandShortcut>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CommandItem
      className={className}
      data-testid="CommanderItemRow"
      forceMount={forceMount}
      keywords={keywords ? [...keywords] : undefined}
      onSelect={handleSelect}
      value={item.value ?? item.id}
    >
      {item.icon ?? null}
      <span className={cn(hasTrailing && 'min-w-0 flex-1')}>{item.label}</span>
      {trailing}
      {shortcut}
    </CommandItem>
  );
};
