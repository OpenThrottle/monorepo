import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { Check, FolderGit2, GitBranch } from 'lucide-react';
import clsx from 'clsx';
import type { ChatCheckoutOption } from '../types';
import { toggleCheckoutSelection } from '../utils/chat-checkout-selection';
import { ChatCheckoutMultiOption } from './ChatCheckoutMultiOption';

export interface ChatCheckoutSelectorProps {
  /** Selectable repositories/checkouts; empty renders a disabled trigger. */
  readonly checkouts: readonly ChatCheckoutOption[];
  readonly className?: string;
  /** Copy shown on the trigger when nothing is selected. */
  readonly emptyLabel?: string;
  /** Ceiling on {@link multiple} selections; ignored in single-select mode. */
  readonly maxCheckouts?: number;
  /**
   * Opt into multi-select: one primary checkout plus additional context
   * directories. Requires {@link onCheckoutsChange}; absent or false keeps the
   * historical single-select rendering.
   */
  readonly multiple?: boolean;
  readonly onCheckoutChange: (checkoutId: string) => void;
  /** Primary-first selection callback, used only in {@link multiple} mode. */
  readonly onCheckoutsChange?: (checkoutIds: readonly string[]) => void;
  readonly placeholder?: string;
  readonly selectedCheckoutId?: string;
  /** Primary-first selection (index 0 is the spawn cwd), in multiple mode. */
  readonly selectedCheckoutIds?: readonly string[];
}

/**
 * @description Controlled, presentational repository/checkout selector (the
 * screenshots' "Current checkout" + branch affordance). The trigger shows the
 * selected checkout's label and, when known, its branch; the dropdown lists
 * the available checkouts with a checkmark on the active one. Fully
 * controlled — the package hardcodes no repositories. Meant to be shown by the
 * toolbar only when the selected backend's `requiresRepository` capability is
 * true.
 *
 * In `multiple` mode (gated by the backend's `maxRepositories` capability) the
 * rows become checkboxes and the FIRST selected id is the primary checkout —
 * the directory the agent process actually runs in. The remainder are context
 * only, which the rows say out loud: the agent is granted read access to them,
 * not a promise that concurrent runs there are safe.
 *
 * @public
 */
export const ChatCheckoutSelector = (
  props: ChatCheckoutSelectorProps,
): React.ReactElement => {
  const {
    checkouts,
    className,
    emptyLabel = 'No checkouts',
    maxCheckouts = 1,
    multiple = false,
    onCheckoutChange,
    onCheckoutsChange,
    placeholder = 'Select checkout',
    selectedCheckoutId,
    selectedCheckoutIds,
  } = props;

  // Hooks

  // Setup
  const hasCheckouts = checkouts.length > 0;
  const isMultiple = multiple && onCheckoutsChange !== undefined;
  const selectedIds = isMultiple ? (selectedCheckoutIds ?? []) : [];
  const primaryId = isMultiple ? selectedIds[0] : selectedCheckoutId;
  const secondaryCount = Math.max(selectedIds.length - 1, 0);
  const atCap = isMultiple && selectedIds.length >= maxCheckouts;
  const selectedCheckout = checkouts.find(
    (checkout) => checkout.id === primaryId,
  );
  const triggerLabel = !hasCheckouts
    ? emptyLabel
    : (selectedCheckout?.label ?? placeholder);
  const triggerBranch = selectedCheckout?.branch;

  // Handlers
  const onSelectCheckout = (checkoutId: string): void => {
    onCheckoutChange(checkoutId);
  };

  const onToggleCheckout = (checkoutId: string): void => {
    onCheckoutsChange?.(
      toggleCheckoutSelection(selectedIds, checkoutId, maxCheckouts),
    );
  };

  // Markup
  const trigger = (
    <Button
      aria-label="Checkout"
      className={clsx('h-8 w-auto max-w-56 gap-1.5', className)}
      data-testid="ChatCheckoutSelector-trigger"
      disabled={!hasCheckouts}
      type="button"
      variant="outline"
    >
      <FolderGit2 className="size-4 shrink-0 opacity-70" />
      <span className="truncate">{triggerLabel}</span>
      {secondaryCount > 0 ? (
        <span
          className="text-muted-foreground shrink-0 text-xs"
          data-testid="ChatCheckoutSelector-overflow"
        >
          {`+${secondaryCount}`}
        </span>
      ) : null}
      {triggerBranch != null && triggerBranch !== '' ? (
        <span
          className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs"
          data-testid="ChatCheckoutSelector-branch"
        >
          <GitBranch className="size-3" />
          {triggerBranch}
        </span>
      ) : null}
    </Button>
  );

  const branchOf = (checkout: ChatCheckoutOption): React.ReactNode =>
    checkout.branch != null && checkout.branch !== '' ? (
      <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
        <GitBranch className="size-3" />
        {checkout.branch}
      </span>
    ) : null;

  // Life Cycle

  // 🔌 Short Circuit
  if (!hasCheckouts) {
    return trigger;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Checkout</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {checkouts.map((checkout) => {
          if (!isMultiple) {
            return (
              <DropdownMenuItem
                className="gap-2"
                data-testid={`ChatCheckoutSelector-option-${checkout.id}`}
                key={checkout.id}
                onSelect={() => onSelectCheckout(checkout.id)}
              >
                <Check
                  className={clsx(
                    'size-4 shrink-0',
                    checkout.id === selectedCheckoutId
                      ? 'opacity-100'
                      : 'opacity-0',
                  )}
                />
                <span className="min-w-0 flex-1 truncate">
                  {checkout.label}
                </span>
                {branchOf(checkout)}
              </DropdownMenuItem>
            );
          }

          return (
            <ChatCheckoutMultiOption
              atCap={atCap}
              checkout={checkout}
              isPrimary={checkout.id === primaryId}
              isSelected={selectedIds.includes(checkout.id)}
              key={checkout.id}
              onToggle={onToggleCheckout}
            />
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
