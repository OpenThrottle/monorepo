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
import { action as roleDetailAction } from '~/routes/roles.$roleId';
import type { useFetcher } from 'react-router';

export interface RoleDeleteDialogProps {
  fetcher: ReturnType<typeof useFetcher<typeof roleDetailAction>>;
}

export const RoleDeleteDialog = (
  props: RoleDeleteDialogProps,
): React.ReactElement => {
  const { fetcher } = props;

  // Hooks

  // Setup
  const DeleteForm = fetcher.Form;

  // Handlers

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
          <DeleteForm method="post">
            <input name="intent" type="hidden" value="deleteRole" />
            <AlertDialogAction asChild={true}>
              <button disabled={fetcher.state !== 'idle'} type="submit">
                {fetcher.state !== 'idle' ? 'Deleting…' : 'Delete'}
              </button>
            </AlertDialogAction>
          </DeleteForm>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
