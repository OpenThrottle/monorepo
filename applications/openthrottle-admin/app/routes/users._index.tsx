import * as React from 'react';
import { redirect } from 'react-router';
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
import { useFetcher } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { CreateUserDocument, GetUsersDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { UsersTable } from '~/routing/users/components/UsersTable';
import type { Route } from '@/app/routes/+types/users._index';

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  try {
    const data = await executeGraphqlWithAuth(request, GetUsersDocument);
    return { users: data.users };
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes('401') || err.message.includes('403'))
    ) {
      return redirect('/');
    }

    throw err;
  }
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Users | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;

  // Hooks
  const [createOpen, setCreateOpen] = React.useState(false);
  const createFetcher = useFetcher<typeof action>();

  // Setup
  const users = loaderData?.users ?? [];
  const CreateUserForm = createFetcher.Form;

  const createSuccess =
    actionData != null && 'ok' in actionData && actionData.ok === true;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (createSuccess) setCreateOpen(false);

    // 🪝 On success we close the create modal
  }, [createSuccess]);

  // 🔌 Short Circuit

  return (
    <>
      <main className="mx-auto max-w-7xl w-full flex flex-col gap-6 p-4 md:p-8 lg:p-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl text-highlight">Users</h1>
        </div>
        <UsersTable users={users} />
      </main>
      <Sheet onOpenChange={setCreateOpen} open={createOpen}>
        <SheetTrigger asChild={true}>
          <Button size="xs" type="button">
            Add user
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Create user</SheetTitle>
          </SheetHeader>
          <CreateUserForm method="post">
            <input name="intent" type="hidden" value="createUser" />
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="create-githubUsername">GitHub username</Label>
                <Input
                  id="create-githubUsername"
                  name="githubUsername"
                  placeholder="visormatt"
                  required={true}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-email">Email (optional)</Label>
                <Input
                  id="create-email"
                  name="email"
                  placeholder="user@example.com"
                  type="email"
                />
              </div>
            </div>
            {createFetcher.data != null && 'error' in createFetcher.data ? (
              <p className="text-destructive text-sm" role="alert">
                {createFetcher.data.error}
              </p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setCreateOpen(false)}
                size="xs"
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                disabled={createFetcher.state !== 'idle'}
                size="xs"
                type="submit"
              >
                {createFetcher.state !== 'idle' ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </CreateUserForm>
        </SheetContent>
      </Sheet>
    </>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { request } = args;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'createUser') {
    const email = formData.get('email');
    const githubUsername = formData.get('githubUsername');

    if (typeof githubUsername !== 'string' || !githubUsername.trim()) {
      return { error: 'GitHub username is required' };
    }

    try {
      const hasEmail = typeof email === 'string';
      await executeGraphqlWithAuth(request, CreateUserDocument, {
        input: {
          email: hasEmail && email.trim() ? email.trim() : null,
          githubUsername: githubUsername.trim(),
        },
      });
      return { ok: true };
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'Failed to create user';

      return { error: message };
    }
  }

  return null;
};

export const ErrorBoundary = GlobalErrorBoundary;
