import * as React from 'react';
import clsx from 'clsx';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { MoreHorizontalIcon } from 'lucide-react';
import { GlobalPopoverActionItem } from './GlobalPopoverActionItem';
import { GlobalPopoverConfirmDialog } from './GlobalPopoverConfirmDialog';
import { isGlobalPopoverConfirmSubmitAction } from '../utils/is-global-popover-confirm-submit-action';

/**
 * @public
 * Confirm copy for a destructive (or otherwise gated) submit action. Owned by
 * {@link GlobalPopover} so every table shares one AlertDialog contract.
 */
export interface GlobalPopoverConfirm {
  readonly cancelLabel?: string;
  readonly confirmLabel?: string;
  readonly description: React.ReactNode;
  readonly title: string;
}

/**
 * @public
 * Discriminated row-action union for {@link GlobalPopover}. Mirrors what
 * `RepositoryRowActions` and the queues column already do: Form submit (optional
 * confirm), Link navigation, and client `onSelect`.
 */
export type GlobalPopoverAction =
  | {
      /**
       * Target route for the Form. Omit to post to the current URL (same as
       * repositories). Cross-route posts (e.g. plans list → `/plans/:id`) should
       * also set `navigate: false` so the list stays mounted.
       */
      readonly action?: string;
      readonly confirm?: GlobalPopoverConfirm;
      readonly destructive?: boolean;
      readonly disabled?: boolean;
      readonly fields: Record<string, string>;
      readonly icon?: React.ReactNode;
      readonly id: string;
      readonly kind: 'submit';
      readonly label: string;
      readonly method?: 'post';
      /** When false, submit without navigating to `action` (React Router Form). */
      readonly navigate?: boolean;
      readonly pending?: boolean;
      readonly pendingLabel?: string;
      readonly separatorBefore?: boolean;
    }
  | {
      readonly disabled?: boolean;
      readonly icon?: React.ReactNode;
      readonly id: string;
      readonly kind: 'link';
      readonly label: string;
      readonly separatorBefore?: boolean;
      readonly to: string;
    }
  | {
      readonly disabled?: boolean;
      readonly icon?: React.ReactNode;
      readonly id: string;
      readonly kind: 'select';
      readonly label: string;
      readonly onSelect: () => void;
      readonly separatorBefore?: boolean;
    };

/**
 * @public
 */
export interface GlobalPopoverProps {
  readonly actions: readonly GlobalPopoverAction[];
  readonly align?: 'center' | 'end' | 'start';
  readonly ariaLabel: string;
  readonly className?: string;
  readonly heading?: string;
  readonly testId?: string;
  readonly trigger?: React.ReactNode;
}

/**
 * @public
 * Shared per-row Actions menu built on DropdownMenu (despite the Popover name).
 * Default trigger matches `RepositoryRowActions`; override via `trigger`.
 */
export const GlobalPopover = (
  props: GlobalPopoverProps,
): React.ReactElement => {
  const {
    actions,
    align = 'end',
    ariaLabel,
    className,
    heading,
    testId = 'GlobalPopover',
    trigger,
  } = props;

  // Hooks
  const [confirmActionId, setConfirmActionId] = React.useState<string | null>(
    null,
  );

  // Setup
  const confirmAction = actions.find(
    (action) =>
      action.id === confirmActionId &&
      isGlobalPopoverConfirmSubmitAction(action),
  );
  const confirmSubmit = isGlobalPopoverConfirmSubmitAction(confirmAction)
    ? confirmAction
    : undefined;

  // Handlers
  const handleConfirmRequest = React.useCallback((actionId: string): void => {
    setConfirmActionId(actionId);
  }, []);

  const handleConfirmOpenChange = React.useCallback((open: boolean): void => {
    if (!open) {
      setConfirmActionId(null);
    }
  }, []);

  // Markup
  const defaultTrigger = (
    <Button
      aria-label={ariaLabel}
      className="size-7"
      size="icon"
      type="button"
      variant="ghost"
    >
      <MoreHorizontalIcon aria-hidden={true} className="size-4" />
    </Button>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('flex justify-end', className)} data-testid={testId}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild={true}>
          {trigger ?? defaultTrigger}
        </DropdownMenuTrigger>

        <DropdownMenuContent align={align}>
          {heading ? <DropdownMenuLabel>{heading}</DropdownMenuLabel> : null}
          {actions.map((action) => (
            <GlobalPopoverActionItem
              action={action}
              key={action.id}
              onConfirmRequest={handleConfirmRequest}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {confirmSubmit?.confirm ? (
        <GlobalPopoverConfirmDialog
          action={confirmSubmit.action}
          cancelLabel={confirmSubmit.confirm.cancelLabel}
          confirmLabel={confirmSubmit.confirm.confirmLabel}
          description={confirmSubmit.confirm.description}
          fields={confirmSubmit.fields}
          method={confirmSubmit.method}
          navigate={confirmSubmit.navigate}
          onOpenChange={handleConfirmOpenChange}
          open={true}
          title={confirmSubmit.confirm.title}
        />
      ) : null}
    </div>
  );
};
