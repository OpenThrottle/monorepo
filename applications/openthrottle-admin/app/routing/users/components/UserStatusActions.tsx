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
  AlertDialogTrigger,
  Button,
} from '@openthrottle/react-router-shadcn';
import type { action as userDetailAction } from '~/routes/users.$userId';
import type { useFetcher } from 'react-router';

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
          <ActionForm method="post">
            <input name="intent" type="hidden" value="disableUser" />
            <AlertDialogAction asChild={true}>
              <button disabled={fetcher.state !== 'idle'} type="submit">
                {fetcher.state !== 'idle' ? 'Disabling…' : 'Disable'}
              </button>
            </AlertDialogAction>
          </ActionForm>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
