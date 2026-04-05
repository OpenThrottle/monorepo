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
import { CreateRoleDocument, GetRolesDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { RolesTable } from '~/routing/roles/components/RolesTable';
import type { Route } from '@/app/routes/+types/roles._index';

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  try {
    const data = await executeGraphqlWithAuth(request, GetRolesDocument);
    return { roles: data.roles };
  } catch (error) {
    const isError = error instanceof Error;

    if (
      isError &&
      (error.message.includes('401') || error.message.includes('403'))
    ) {
      return redirect('/');
    }

    throw error;
  }
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Roles | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;

  // Hooks
  const [createOpen, setCreateOpen] = React.useState(false);
  const createFetcher = useFetcher<typeof action>();

  // Setup
  const roles = loaderData?.roles ?? [];
  const CreateRoleForm = createFetcher.Form;

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
    <main className="mx-auto max-w-7xl w-full flex flex-col gap-6 p-4 md:p-8 lg:p-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl text-highlight">Roles</h1>
        <Sheet onOpenChange={setCreateOpen} open={createOpen}>
          <SheetTrigger asChild={true}>
            <Button size="xs" type="button">
              Add role
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Create role</SheetTitle>
            </SheetHeader>
            <CreateRoleForm method="post">
              <input name="intent" type="hidden" value="createRole" />
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-name">Name</Label>
                  <Input
                    id="create-name"
                    name="name"
                    placeholder="e.g. admin, editor"
                    required={true}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-description">
                    Description (optional)
                  </Label>
                  <Input
                    id="create-description"
                    name="description"
                    placeholder="Human-readable description"
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
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button disabled={createFetcher.state !== 'idle'} type="submit">
                  {createFetcher.state !== 'idle' ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </CreateRoleForm>
          </SheetContent>
        </Sheet>
      </div>
      <RolesTable roles={roles} />
    </main>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { request } = args;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'createRole') {
    const name = formData.get('name');
    const description = formData.get('description');

    if (typeof name !== 'string' || !name.trim()) {
      return { error: 'Role name is required' };
    }

    try {
      const hasDescription = typeof description === 'string';
      await executeGraphqlWithAuth(request, CreateRoleDocument, {
        input: {
          description:
            hasDescription && description.trim() ? description.trim() : null,
          name: name.trim(),
        },
      });

      return { ok: true };
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'Failed to create role';

      return { error: message };
    }
  }

  return null;
};

export const ErrorBoundary = GlobalErrorBoundary;
