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
import { Form } from 'react-router';
import { GLOBAL_POPOVER_COPY } from '../data/data.copy';

/**
 * @public
 * Confirm shell for a {@link GlobalPopover} `kind: 'submit'` action that
 * declared `confirm`. Owns the AlertDialog + Form so callers never re-invent
 * the remove/revoke gate.
 */
export interface GlobalPopoverConfirmDialogProps {
  readonly action?: string;
  readonly cancelLabel?: string;
  readonly confirmLabel?: string;
  readonly description: React.ReactNode;
  readonly fields: Record<string, string>;
  readonly method?: 'post';
  readonly navigate?: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}

/**
 * @public
 */
export const GlobalPopoverConfirmDialog = (
  props: GlobalPopoverConfirmDialogProps,
): React.ReactElement => {
  const {
    action,
    cancelLabel = GLOBAL_POPOVER_COPY.cancelLabel,
    confirmLabel = GLOBAL_POPOVER_COPY.confirmLabel,
    description,
    fields,
    method = 'post',
    navigate,
    onOpenChange,
    open,
    title,
  } = props;

  // Hooks

  // Setup
  const fieldEntries = Object.keys(fields)
    .sort()
    .map((name) => ({ name, value: fields[name] ?? '' }));

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent data-testid="GlobalPopoverConfirmDialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <Form action={action} method={method} navigate={navigate}>
            {fieldEntries.map((field) => (
              <input
                key={field.name}
                name={field.name}
                type="hidden"
                value={field.value}
              />
            ))}
            <AlertDialogAction type="submit">{confirmLabel}</AlertDialogAction>
          </Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
