import * as React from 'react';
import { CommandItem } from '@openthrottle/react-router-shadcn';
import { Check, GitBranch } from 'lucide-react';
import clsx from 'clsx';
import type { ChatCheckoutOption } from '../types';
import { checkoutSearchTerms } from '../utils/checkout-groups';
import type { ChatCheckoutDescriptor } from '../utils/checkout-labels';

export interface ChatCheckoutSelectorRowProps {
  /** True when a {@link multiple} selection is at its cap, so unselected rows go inert. */
  readonly atCap: boolean;
  readonly checkout: ChatCheckoutOption;
  /**
   * Label + qualifier already resolved against the whole list. Optional so the
   * row still renders from `checkout` alone if a lookup ever misses.
   */
  readonly descriptor?: ChatCheckoutDescriptor;
  /** True when this row is index 0 of the selection — the spawn `cwd`. */
  readonly isPrimary: boolean;
  readonly isSelected: boolean;
  /** Checkbox semantics (primary + context directories) instead of single-select. */
  readonly multiple: boolean;
  readonly onSelect: (checkoutId: string) => void;
}

/**
 * @description One row in {@link ChatCheckoutSelector}'s searchable list. The
 * display name leads; underneath it sits the qualifier that makes two
 * same-named checkouts tellable apart (`owner/repo`, or a shortened filesystem
 * path when there is no remote), with the branch on the right.
 *
 * In `multiple` mode the row labels the primary checkout (where the agent
 * process actually runs) and marks every other selection "Context only" — the
 * agent is granted the directory, but the row deliberately stops short of
 * implying that concurrent runs against that checkout are safe.
 *
 * @public
 */
export const ChatCheckoutSelectorRow = (
  props: ChatCheckoutSelectorRowProps,
): React.ReactElement => {
  const {
    atCap,
    checkout,
    descriptor,
    isPrimary,
    isSelected,
    multiple,
    onSelect,
  } = props;
  const label = descriptor?.label ?? checkout.label;
  const qualifier = descriptor?.qualifier;

  // Hooks

  // Setup
  const hasBranch = checkout.branch != null && checkout.branch !== '';
  // At the cap, unselected rows are inert but selected ones stay toggleable —
  // otherwise the list traps the user with no way back under the cap.
  const disabled = multiple && atCap && !isSelected;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CommandItem
      className="gap-2"
      data-testid={`ChatCheckoutSelector-option-${checkout.id}`}
      disabled={disabled}
      keywords={[...checkoutSearchTerms(checkout)]}
      onSelect={() => onSelect(checkout.id)}
      value={checkout.id}
    >
      <Check
        className={clsx(
          'size-4 shrink-0',
          isSelected ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {qualifier != null ? (
          <span
            className="text-muted-foreground truncate text-xs"
            data-testid={`ChatCheckoutSelector-qualifier-${checkout.id}`}
          >
            {qualifier}
          </span>
        ) : null}
      </span>
      {multiple && isPrimary ? (
        <span
          className="text-muted-foreground shrink-0 text-xs"
          data-testid={`ChatCheckoutSelector-primary-${checkout.id}`}
        >
          Primary
        </span>
      ) : null}
      {multiple && isSelected && !isPrimary ? (
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
    </CommandItem>
  );
};
