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
import {
  executeGraphqlWithAuth,
  isAuthError,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { CreateUserDocument, GetUsersDocument } from '~/__generated__/graphql';
import { CreateUserInputSchema } from '~/__generated__/schemas';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { UserIcon } from 'lucide-react';
import { UsersTable } from '~/routing/users/components/UsersTable';
import type { Route } from '@/app/routes/+types/users._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Users',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  try {
    const data = await executeGraphqlWithAuth(request, GetUsersDocument);

    return { users: data.users };
  } catch (error) {
    if (isAuthError(error)) {
      return redirect('/');
    }

    throw error;
  }
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Users | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const fetcher = useFetcher<typeof action>();

  // Setup
  const users = loaderData?.users ?? [];
  const CreateUserForm = fetcher.Form;

  const createSuccess =
    actionData != null && 'ok' in actionData && actionData.ok === true;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (createSuccess) setOpen(false);

    // 🪝 On success we close the create modal
  }, [createSuccess]);

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={UserIcon}
          title="Users"
        />
        <p className="text-muted-foreground text-sm">View and manage users.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Sheet onOpenChange={setOpen} open={open}>
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
              {fetcher.data != null && 'error' in fetcher.data ? (
                <p className="text-destructive text-sm" role="alert">
                  {fetcher.data.error}
                </p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setOpen(false)}
                  size="xs"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  disabled={fetcher.state !== 'idle'}
                  size="xs"
                  type="submit"
                >
                  {fetcher.state !== 'idle' ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </CreateUserForm>
          </SheetContent>
        </Sheet>
      </div>
      <UsersTable users={users} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { request } = args;

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'createUser') {
    const parsed = parseFormData(formData, CreateUserInputSchema(), {
      strict: false,
    });
    if (!parsed.success) {
      return { error: 'GitHub username is required' };
    }

    try {
      await executeGraphqlWithAuth(request, CreateUserDocument, {
        input: {
          email: parsed.data.email ?? null,
          githubUsername: parsed.data.githubUsername,
        },
      });
      return { ok: true };
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'Failed to create user';

      return { error: message };
    }
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
