import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@openthrottle/react-router-shadcn';

export interface ConfirmModalProps {
  /** When true, the modal is open. */
  readonly open: boolean;
  /** Callback when the user confirms (primary action). */
  readonly onConfirm: () => void;
  /** Callback when the user cancels or closes the modal. */
  readonly onCancel: () => void;
  /** Title of the modal. */
  readonly title: string;
  /** Description or body text. */
  readonly description: string;
  /** Label for the confirm button (e.g. "Delete", "Archive"). */
  readonly confirmLabel: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  readonly cancelLabel?: string;
  /** When true, the confirm button uses destructive styling. */
  readonly destructive?: boolean;
}

/**
 * @description Reusable confirmation modal using shadcn-ui AlertDialog. Use for archive, delete, or other destructive/reversible actions that require user confirmation.
 */
export const ConfirmModal = (props: ConfirmModalProps) => {
  const {
    open,
    onConfirm,
    onCancel,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Cancel',
    destructive = false,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AlertDialog onOpenChange={(o) => !o && onCancel()} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className={
              destructive
                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                : undefined
            }
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
