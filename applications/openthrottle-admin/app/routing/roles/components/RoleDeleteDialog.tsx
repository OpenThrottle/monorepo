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

import type { action as roleDetailAction } from '~/routes/roles.$roleId';

export interface RoleDeleteDialogProps {
  fetcher: ReturnType<typeof useFetcher<typeof roleDetailAction>>;
}

export const RoleDeleteDialog = (
  props: RoleDeleteDialogProps,
): React.ReactElement => {
  const { fetcher } = props;

  // Hooks

  // Setup

  // Handlers
  // Submit through the fetcher rather than a rendered form. `AlertDialogAction`
  // is a `Dialog.Close`, so confirming unmounts `AlertDialogContent` — and any
  // form inside it — within the same click, and the browser then cancels the
  // submit of a detached form without sending anything. See OT b68853fb.
  const handleDelete = React.useCallback((): void => {
    void fetcher.submit({ intent: 'deleteRole' }, { method: 'post' });
  }, [fetcher]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild={true}>
        <Button
          disabled={fetcher.state !== 'idle'}
          type="button"
          variant="destructive"
        >
          Delete role
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete role</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this role and remove it from all users.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={fetcher.state !== 'idle'}
            onClick={handleDelete}
            type="button"
          >
            {fetcher.state !== 'idle' ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
