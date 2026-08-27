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

export interface ChatCheckoutSelectorProps {
  /** Selectable repositories/checkouts; empty renders a disabled trigger. */
  readonly checkouts: readonly ChatCheckoutOption[];
  readonly className?: string;
  /** Copy shown on the trigger when nothing is selected. */
  readonly emptyLabel?: string;
  readonly onCheckoutChange: (checkoutId: string) => void;
  readonly placeholder?: string;
  readonly selectedCheckoutId?: string;
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
 * @public
 */
export const ChatCheckoutSelector = (
  props: ChatCheckoutSelectorProps,
): React.ReactElement => {
  const {
    checkouts,
    className,
    emptyLabel = 'No checkouts',
    onCheckoutChange,
    placeholder = 'Select checkout',
    selectedCheckoutId,
  } = props;

  // Hooks

  // Setup
  const hasCheckouts = checkouts.length > 0;
  const selectedCheckout = checkouts.find(
    (checkout) => checkout.id === selectedCheckoutId,
  );
  const triggerLabel = !hasCheckouts
    ? emptyLabel
    : (selectedCheckout?.label ?? placeholder);
  const triggerBranch = selectedCheckout?.branch;

  // Handlers
  const onSelectCheckout = (checkoutId: string): void => {
    onCheckoutChange(checkoutId);
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
          const isActive = checkout.id === selectedCheckoutId;
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
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className="min-w-0 flex-1 truncate">{checkout.label}</span>
              {checkout.branch != null && checkout.branch !== '' ? (
                <span className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs">
                  <GitBranch className="size-3" />
                  {checkout.branch}
                </span>
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
