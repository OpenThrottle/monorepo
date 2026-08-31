import * as React from 'react';
import { CommandItem } from '@openthrottle/react-router-shadcn';
import { Check, GitBranch } from 'lucide-react';
import clsx from 'clsx';
import type { ChatCheckoutOption } from '../types';
import { checkoutSearchTerms } from '../utils/checkout-groups';
import type { ChatCheckoutDescriptor } from '../utils/checkout-labels';
import { shortenBranchName } from '../utils/repository-identity';

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
 * ## Branch-truncation contract
 *
 * Shared verbatim with {@link ChatCheckoutSelectorTrigger} — change it in both
 * or in neither, or the two faces of the same picker drift apart.
 *
 * 1. **Direction — middle-ellipsis, tail preserved.** Every branch in a real
 *    workspace shares a short author/tool prefix (`visormatt/`, `claude/`,
 *    `openthrottle/`) and differs in its tail, so an end-`truncate` would
 *    render two unrelated branches identically. `shortenBranchName` keeps the
 *    head and the tail and drops the middle.
 * 2. **Shrink priority — the display name yields last.** The name is what the
 *    user picks on, so it keeps `min-w-0 flex-1`. The branch is capped
 *    (`max-w-*`), allowed to shrink, and carries `truncate` as the CSS
 *    backstop behind the character-count shortening. The short fixed-width
 *    `Primary` / `Context only` labels stay `shrink-0`.
 * 3. **Full value — `title` on the branch element.** A `Tooltip` here would
 *    nest a third portal inside Popover → Command for what is a hover string;
 *    `title` is native, works inside the popover, and holds no state.
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
  // Narrowed to a local so the JSX below can render it without a non-null cast.
  const branch =
    checkout.branch != null && checkout.branch !== '' ? checkout.branch : null;
  // At the cap, unselected rows are inert but selected ones stay toggleable —
  // otherwise the list traps the user with no way back under the cap.
  const disabled = multiple && atCap && !isSelected;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CommandItem
      // CommandItem is `relative flex items-center` with no clipping of its own,
      // so a child that refuses to shrink would spill past the popover edge
      // rather than being cut — the backstop behind the branch cap below.
      className="gap-2 overflow-hidden"
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
      {branch != null ? (
        <span
          className="text-muted-foreground flex max-w-44 min-w-0 items-center gap-1 text-xs"
          data-testid={`ChatCheckoutSelector-branch-${checkout.id}`}
          title={branch}
        >
          <GitBranch className="size-3 shrink-0" />
          <span className="truncate">{shortenBranchName(branch)}</span>
        </span>
      ) : null}
    </CommandItem>
  );
};
