import { cn, CommandItem } from '@openthrottle/react-router-shadcn';
import { Check, FolderGit2, GitBranch, GitFork } from 'lucide-react';
import * as React from 'react';

import { CHECKOUT_ROW_MAX_CHARS } from '../data/data.checkout-row';
import { CHAT_CHECKOUT_ROW_COPY } from '../data/data.copy';
import { ChatCheckoutKind, type ChatCheckoutOption } from '../types';
import {
  shortenBranchName,
  shortenCheckoutPath,
} from '../utils/checkout-display';
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
  /**
   * A worktree sitting directly beneath its repository's primary checkout:
   * the row indents so the parent/child relationship reads at a glance.
   */
  readonly nested?: boolean;
  readonly onSelect: (checkoutId: string) => void;
}

/**
 * @description One row in {@link ChatCheckoutSelector}'s searchable list, three
 * lines tall: the display name, then the branch, then where it lives on disk.
 * A leading icon says what the row IS — a folder for a primary clone, a fork
 * for a linked worktree — and worktrees indent beneath their primary.
 *
 * Branch names and paths are the two long values, and each is shortened where
 * its signal is: the branch middle-ellipsized (prefix AND tail survive), the
 * path collapsed to `~` and tail-fitted. Both caps live in
 * `data.checkout-row.ts`, sized to the popover's column; the full value is on
 * `title` and CSS `truncate` is the backstop.
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
    nested = false,
    onSelect,
  } = props;
  const { branch, filesystemPath, id } = checkout;

  // Hooks

  // Setup
  const label = descriptor?.label ?? checkout.label;
  const hasBranch = branch != null && branch !== '';
  const hasPath = filesystemPath != null && filesystemPath !== '';
  // The location line: where the checkout lives on disk, else the remote's
  // `owner/name` qualifier when the consumer supplied no path.
  const location = hasPath
    ? shortenCheckoutPath(filesystemPath, CHECKOUT_ROW_MAX_CHARS.path)
    : descriptor?.qualifier;
  const isWorktree = checkout.kind === ChatCheckoutKind.worktree;
  const KindIcon = isWorktree ? GitFork : FolderGit2;
  // At the cap, unselected rows are inert but selected ones stay toggleable —
  // otherwise the list traps the user with no way back under the cap.
  const disabled = multiple && atCap && !isSelected;
  const showPrimary = multiple && isPrimary;
  const showContext = multiple && isSelected && !isPrimary;

  // Handlers

  // Markup
  const badgeClassName = `text-muted-foreground shrink-0 rounded border px-1 text-[10px] uppercase`;
  const primaryNode = (
    <span
      className={badgeClassName}
      data-testid={`ChatCheckoutSelector-primary-${id}`}
    >
      {CHAT_CHECKOUT_ROW_COPY.primary}
    </span>
  );
  const contextNode = (
    <span
      className={badgeClassName}
      data-testid={`ChatCheckoutSelector-context-${id}`}
    >
      {CHAT_CHECKOUT_ROW_COPY.contextOnly}
    </span>
  );
  const branchNode = (
    <span
      className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs"
      data-testid={`ChatCheckoutSelector-row-branch-${id}`}
      title={branch}
    >
      <GitBranch className="size-3 shrink-0" />
      <span className="truncate">
        {shortenBranchName(branch ?? '', CHECKOUT_ROW_MAX_CHARS.branch)}
      </span>
    </span>
  );
  const locationNode = (
    <span
      className="text-muted-foreground/70 truncate text-xs"
      data-testid={`ChatCheckoutSelector-qualifier-${id}`}
      title={filesystemPath}
    >
      {location}
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <CommandItem
      className="overflow-hidden"
      data-kind={
        isWorktree ? ChatCheckoutKind.worktree : ChatCheckoutKind.primary
      }
      data-nested={nested}
      data-testid={`ChatCheckoutSelector-option-${id}`}
      disabled={disabled}
      keywords={[...checkoutSearchTerms(checkout)]}
      onSelect={() => onSelect(id)}
      value={id}
    >
      {/* Layout lives on this wrapper, not the item: the shadcn package's
          unlayered `[cmdk-item]` rule (commander.css) sets padding and
          align-items, and unlayered CSS beats Tailwind utilities — `pl-*`,
          `py-*` and `items-start` on the item are silently dropped. */}
      <div
        className={cn(
          'flex w-full min-w-0 items-start gap-2 py-2',
          nested ? 'pl-5' : null,
        )}
      >
        <KindIcon
          aria-hidden={!isWorktree}
          aria-label={isWorktree ? CHAT_CHECKOUT_ROW_COPY.worktree : undefined}
          className="text-muted-foreground mt-0.5 size-4 shrink-0"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{label}</span>
            {showPrimary ? primaryNode : null}
            {showContext ? contextNode : null}
          </span>
          {hasBranch ? branchNode : null}
          {location === undefined ? null : locationNode}
        </span>
        <Check
          className={cn(
            'mt-0.5 size-4 shrink-0',
            isSelected ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
    </CommandItem>
  );
};
