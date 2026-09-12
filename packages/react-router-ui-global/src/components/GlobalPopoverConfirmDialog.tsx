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
import * as React from 'react';
import { useFetcher, useSubmit } from 'react-router';

import { GLOBAL_POPOVER_COPY } from '../data/data.copy';

/**
 * @public
 * Confirm shell for a {@link GlobalPopover} `kind: 'submit'` action that
 * declared `confirm`. Owns the AlertDialog and the submission so callers never
 * re-invent the remove/revoke gate.
 */
export interface GlobalPopoverConfirmDialogProps {
  readonly action?: string;
  readonly cancelLabel?: string;
  readonly confirmLabel?: string;
  readonly description: React.ReactNode;
  /** When set, the submission runs on a keyed fetcher the caller can observe. */
  readonly fetcherKey?: string;
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
    fetcherKey,
    fields,
    method = 'post',
    navigate,
    onOpenChange,
    open,
    title,
  } = props;

  // Hooks
  const fetcher = useFetcher({ key: fetcherKey });
  const submit = useSubmit();

  // Setup

  // Handlers
  // Submit imperatively rather than through a rendered `<Form>`. Radix's
  // `AlertDialogAction` is a `Dialog.Close`, so confirming fires
  // `onOpenChange(false)`; the owner (`GlobalPopover`) responds by clearing the
  // pending action id, which unmounts this dialog — and with it the form —
  // inside the same discrete click event. The browser then refuses to submit a
  // detached form ("Form submission canceled because the form is not
  // connected") and the request is silently never sent. Dispatching through the
  // router directly does not depend on the form still being in the document.
  const handleConfirm = React.useCallback((): void => {
    const formData = new FormData();

    for (const name of Object.keys(fields).sort()) {
      formData.append(name, fields[name] ?? '');
    }

    // A keyed fetcher is what lets the call site observe this submission, so
    // prefer it when one was requested. It never navigates, which is already
    // what every keyed caller wants; unkeyed callers keep `useSubmit` so a
    // navigating submit stays navigating.
    if (fetcherKey !== undefined) {
      void fetcher.submit(formData, { action, method });

      return;
    }

    void submit(formData, { action, method, navigate });
  }, [action, fetcher, fetcherKey, fields, method, navigate, submit]);

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
          <AlertDialogAction onClick={handleConfirm} type="button">
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
