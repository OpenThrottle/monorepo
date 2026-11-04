import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import type { useFetcher } from 'react-router';

import type { action as userDetailAction } from '~/routes/users.$userId';

export interface UserStatusActionsProps {
  fetcher: ReturnType<typeof useFetcher<typeof userDetailAction>>;
  isDisabled: boolean;
}

export const UserStatusActions = (
  props: UserStatusActionsProps,
): React.ReactElement => {
  const { fetcher, isDisabled } = props;

  // Hooks

  // Setup
  const ActionForm = fetcher.Form;

  // Handlers
  // Submit through the fetcher rather than a rendered form. `AlertDialogAction`
  // is a `Dialog.Close`, so confirming unmounts `AlertDialogContent` — and any
  // form inside it — within the same click, and the browser then cancels the
  // submit of a detached form without sending anything. See OT b68853fb.
  const handleDisable = React.useCallback((): void => {
    void fetcher.submit({ intent: 'disableUser' }, { method: 'post' });
  }, [fetcher]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isDisabled) {
    return (
      <ActionForm method="post">
        <input name="intent" type="hidden" value="enableUser" />
        <Button
          disabled={fetcher.state !== 'idle'}
          type="submit"
          variant="outline"
        >
          {fetcher.state !== 'idle' ? 'Enabling…' : 'Enable user'}
        </Button>
      </ActionForm>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild={true}>
        <Button
          disabled={fetcher.state !== 'idle'}
          type="button"
          variant="destructive"
        >
          Disable user
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disable user</AlertDialogTitle>
          <AlertDialogDescription>
            This will disable the user account. They will no longer be able to
            sign in until the account is re-enabled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={fetcher.state !== 'idle'}
            onClick={handleDisable}
            type="button"
          >
            {fetcher.state !== 'idle' ? 'Disabling…' : 'Disable'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
