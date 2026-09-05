import * as React from 'react';
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@openthrottle/react-router-shadcn';
import type { action as userDetailAction } from '~/routes/users.$userId';
import type { useFetcher } from 'react-router';
import type { UserDetailsFragment } from '~/__generated__/graphql';

export interface UserEditSheetProps {
  fetcher: ReturnType<typeof useFetcher<typeof userDetailAction>>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  user: UserDetailsFragment;
}

export const UserEditSheet = (
  props: UserEditSheetProps,
): React.ReactElement => {
  const { fetcher, onOpenChange, open, user } = props;

  // Hooks

  // Setup
  const UpdateForm = fetcher.Form;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetTrigger asChild={true}>
        <Button type="button" variant="outline">
          Edit user
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit user</SheetTitle>
        </SheetHeader>
        <UpdateForm method="post">
          <input name="intent" type="hidden" value="updateUser" />
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-githubUsername">GitHub username</Label>
              <Input
                defaultValue={user.githubUsername}
                id="edit-githubUsername"
                name="githubUsername"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email (optional)</Label>
              <Input
                defaultValue={user.email ?? ''}
                id="edit-email"
                name="email"
                type="email"
              />
            </div>
          </div>
          {fetcher.data != null && 'error' in fetcher.data ? (
            <p className="text-destructive text-sm" role="alert">
              {fetcher.data.error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={fetcher.state !== 'idle'} type="submit">
              {fetcher.state !== 'idle' ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </UpdateForm>
      </SheetContent>
    </Sheet>
  );
};
