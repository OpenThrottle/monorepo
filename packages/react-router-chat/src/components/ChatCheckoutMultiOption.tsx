import * as React from 'react';
import { DropdownMenuCheckboxItem } from '@openthrottle/react-router-shadcn';
import { GitBranch } from 'lucide-react';
import type { ChatCheckoutOption } from '../types';

export interface ChatCheckoutMultiOptionProps {
  /** True when the selection is at its cap, so unselected rows go inert. */
  readonly atCap: boolean;
  readonly checkout: ChatCheckoutOption;
  /** True when this row is index 0 of the selection — the spawn `cwd`. */
  readonly isPrimary: boolean;
  readonly isSelected: boolean;
  readonly onToggle: (checkoutId: string) => void;
}

/**
 * @description One checkbox row in {@link ChatCheckoutSelector}'s multiple
 * mode. Labels the primary checkout (where the agent process actually runs)
 * and marks every other selection "Context only" — the agent is granted the
 * directory, but the row deliberately stops short of implying that concurrent
 * runs against that checkout are safe.
 *
 * @public
 */
export const ChatCheckoutMultiOption = (
  props: ChatCheckoutMultiOptionProps,
): React.ReactElement => {
  const { atCap, checkout, isPrimary, isSelected, onToggle } = props;

  // Hooks

  // Setup
  const hasBranch = checkout.branch != null && checkout.branch !== '';

  // Handlers
  // Radix closes the menu on select; multi-select has to survive several
  // toggles in a row, so the default is suppressed.
  const onSelect = (event: Event): void => {
    event.preventDefault();
    onToggle(checkout.id);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <DropdownMenuCheckboxItem
      checked={isSelected}
      data-testid={`ChatCheckoutSelector-option-${checkout.id}`}
      // At the cap, unselected rows are inert but selected ones stay
      // toggleable — otherwise the menu traps the user.
      disabled={atCap && !isSelected}
      onSelect={onSelect}
    >
      <span className="min-w-0 flex-1 truncate">{checkout.label}</span>
      {isPrimary ? (
        <span
          className="text-muted-foreground shrink-0 text-xs"
          data-testid={`ChatCheckoutSelector-primary-${checkout.id}`}
        >
          Primary
        </span>
      ) : null}
      {isSelected && !isPrimary ? (
        <span
          className="text-muted-foreground shrink-0 text-xs"
          data-testid={`ChatCheckoutSelector-context-${checkout.id}`}
        >
          Context only
        </span>
      ) : null}
      {hasBranch ? (
        <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
          <GitBranch className="size-3" />
          {checkout.branch}
        </span>
      ) : null}
    </DropdownMenuCheckboxItem>
  );
};
