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
import { action as roleDetailAction } from '~/routes/roles.$roleId';
import type { Route } from '@/app/routes/+types/roles.$roleId';
import type { useFetcher } from 'react-router';

type RoleDetail = NonNullable<Route.ComponentProps['loaderData']['role']>;

export interface RoleEditSheetProps {
  fetcher: ReturnType<typeof useFetcher<typeof roleDetailAction>>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  role: RoleDetail;
}

export const RoleEditSheet = (
  props: RoleEditSheetProps,
): React.ReactElement => {
  const { fetcher, onOpenChange, open, role } = props;

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
          Edit role
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit role</SheetTitle>
        </SheetHeader>
        <UpdateForm method="post">
          <input name="intent" type="hidden" value="updateRole" />
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input defaultValue={role.name} id="edit-name" name="name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                defaultValue={role.description ?? ''}
                id="edit-description"
                name="description"
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
