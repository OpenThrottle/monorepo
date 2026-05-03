import * as React from 'react';
import { redirect } from 'react-router';
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
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@openthrottle/react-router-shadcn';
import { Link, useFetcher } from 'react-router';
import { formatDate } from 'date-fns';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  AssignRoleToUserDocument,
  DisableUserDocument,
  EnableUserDocument,
  GetRolesForUserDocument,
  GetUserDocument,
  ListRolesForAssignDocument,
  RemoveRoleFromUserDocument,
  UpdateUserDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/users.$userId';

interface AssignRoleSelectFormProps {
  readonly availableRoles: Array<{ id: string; name: string }>;
  readonly fetcher: ReturnType<typeof useFetcher<typeof action>>;
}

/**
 * @description Assign-role form using shadcn-ui Select; syncs selected value to a hidden input for form submission.
 */
function AssignRoleSelectForm(
  props: AssignRoleSelectFormProps,
): React.ReactElement {
  const { availableRoles, fetcher } = props;
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('');

  const Form = fetcher.Form;

  return (
    <Form method="post">
      <input name="intent" type="hidden" value="assignRole" />
      <input name="roleId" type="hidden" value={selectedRoleId} />
      <div className="flex items-center gap-2">
        <Select
          onValueChange={setSelectedRoleId}
          value={selectedRoleId || undefined}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Assign role…" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={fetcher.state !== 'idle' || !selectedRoleId}
          size="sm"
          type="submit"
        >
          Assign
        </Button>
      </div>
    </Form>
  );
}

export const loader = async (args: Route.LoaderArgs) => {
  const { request, params } = args;
  const userId = params.userId;

  if (!userId) {
    throw new Response('Not found', { status: 404 });
  }

  try {
    const [userResult, rolesForUserResult, rolesListResult] = await Promise.all(
      [
        executeGraphqlWithAuth(request, GetUserDocument, { id: userId }),
        executeGraphqlWithAuth(request, GetRolesForUserDocument, { userId }),
        executeGraphqlWithAuth(request, ListRolesForAssignDocument, {}),
      ],
    );
    return {
      rolesForUser: rolesForUserResult.rolesForUser,
      rolesList: rolesListResult.roles,
      user: userResult.user ?? null,
    };
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    if (isError && (message.includes('401') || message.includes('403'))) {
      return redirect('/');
    }

    throw error;
  }
};

export const meta = (_args: Route.MetaArgs) => {
  const title = `User Details | ${SITE_TITLE}`;

  return [{ title }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;

  // Hooks
  const [editOpen, setEditOpen] = React.useState(false);
  const fetcher = useFetcher<typeof action>();

  // Setup
  const user = loaderData.user;
  const rolesForUser = loaderData?.rolesForUser ?? [];
  const rolesList = loaderData?.rolesList ?? [];
  const userRoleIds = new Set(rolesForUser.map((r) => r.id));
  const availableRoles = rolesList.filter((r) => !userRoleIds.has(r.id));

  const isSuccess =
    actionData != null && 'ok' in actionData && actionData.ok === true;

  const isDisabled = user?.disabledAt != null;
  const UpdateForm = fetcher.Form;
  const ActionForm = fetcher.Form;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (isSuccess) setEditOpen(false);

    // 🪝 On success we close the edit modal
  }, [isSuccess]);

  // 🔌 Short Circuit
  if (user == null) {
    return (
      <main className="mx-auto max-w-7xl w-full p-4 md:p-8 lg:p-12">
        <p className="text-muted-foreground">User not found.</p>
      </main>
    );
  }

  return (
    <main className="w-full flex flex-col gap-6 p-4 md:p-8 lg:p-12">
      <p className="text-sm text-muted-foreground">
        <Link
          className="underline underline-offset-2 hover:text-primary"
          to="/users"
          viewTransition={true}
        >
          ← Back to users
        </Link>
      </p>
      <Card data-testid="user-detail">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{user.githubUsername}</CardTitle>
          {isDisabled ? (
            <Badge variant="secondary">Disabled</Badge>
          ) : (
            <Badge variant="outline">Active</Badge>
          )}
        </CardHeader>

        <CardContent className="grid gap-4">
          <div>
            <span className="text-muted-foreground text-sm">Email</span>
            <p>{user.email ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">
              GitHub username
            </span>
            <p>{user.githubUsername}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">Created</span>
            <p>{formatDate(user.createdAt, 'MMM d, yyyy')}</p>
          </div>

          {user.updatedAt ? (
            <div>
              <span className="text-muted-foreground text-sm">Updated</span>
              <p>{formatDate(user.updatedAt, 'MMM d, yyyy')}</p>
            </div>
          ) : null}

          {user.disabledAt ? (
            <div>
              <span className="text-muted-foreground text-sm">Disabled at</span>
              <p>{formatDate(user.disabledAt, 'MMM d, yyyy')}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Sheet onOpenChange={setEditOpen} open={editOpen}>
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
                  onClick={() => setEditOpen(false)}
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

        {isDisabled ? (
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
        ) : (
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
                  This will disable the user account. They will no longer be
                  able to sign in until the account is re-enabled.
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
        )}
      </div>

      <Card data-testid="user-roles">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Roles</CardTitle>
          {availableRoles.length > 0 ? (
            <AssignRoleSelectForm
              availableRoles={availableRoles}
              fetcher={fetcher}
            />
          ) : null}
        </CardHeader>
        <CardContent>
          {rolesForUser.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No roles assigned. Assign one above.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {rolesForUser.map((r) => (
                <li className="flex items-center gap-1" key={r.id}>
                  <Link
                    className="font-medium underline underline-offset-2 hover:text-primary"
                    to={`/roles/${r.id}`}
                    viewTransition={true}
                  >
                    {r.name}
                  </Link>
                  <fetcher.Form method="post">
                    <input name="intent" type="hidden" value="removeRole" />
                    <input name="roleId" type="hidden" value={r.id} />
                    <Button
                      aria-label={`Remove role ${r.name}`}
                      disabled={fetcher.state !== 'idle'}
                      size="icon"
                      type="submit"
                      variant="ghost"
                    >
                      ×
                    </Button>
                  </fetcher.Form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { request, params } = args;

  const userId = params.userId;
  if (!userId) {
    return { error: 'User not found' };
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'assignRole') {
      const roleId = formData.get('roleId');

      if (typeof roleId === 'string' && roleId) {
        await executeGraphqlWithAuth(request, AssignRoleToUserDocument, {
          input: { roleId, userId },
        });

        return { ok: true };
      }
    }

    if (intent === 'disableUser') {
      await executeGraphqlWithAuth(request, DisableUserDocument, {
        id: userId,
      });

      return { ok: true };
    }

    if (intent === 'enableUser') {
      await executeGraphqlWithAuth(request, EnableUserDocument, { id: userId });

      return { ok: true };
    }

    if (intent === 'removeRole') {
      const roleId = formData.get('roleId');

      if (typeof roleId === 'string' && roleId) {
        await executeGraphqlWithAuth(request, RemoveRoleFromUserDocument, {
          input: { roleId, userId },
        });

        return { ok: true };
      }
    }

    if (intent === 'updateUser') {
      const email = formData.get('email');
      const githubUsername = formData.get('githubUsername');

      await executeGraphqlWithAuth(request, UpdateUserDocument, {
        input: {
          email:
            typeof email === 'string' && email.trim()
              ? email.trim()
              : undefined,
          githubUsername:
            typeof githubUsername === 'string' && githubUsername.trim()
              ? githubUsername.trim()
              : undefined,
          id: userId,
        },
      });

      return { ok: true };
    }
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Action failed';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
