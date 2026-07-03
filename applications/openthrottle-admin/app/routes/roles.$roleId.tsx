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
import { useFetcher } from 'react-router';
import { formatDate } from 'date-fns';
import {
  executeGraphqlWithAuth,
  isAuthError,
} from '@openthrottle/react-router-graphql';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  AddPermissionToRoleDocument,
  DeleteRoleDocument,
  GetPermissionsDocument,
  GetRoleDocument,
  RemovePermissionFromRoleDocument,
  UpdateRoleDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { ShieldCheckIcon } from 'lucide-react';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/roles.$roleId';

interface AddPermissionSelectFormProps {
  readonly availablePermissions: Array<{ id: string; name: string }>;
  readonly fetcher: ReturnType<typeof useFetcher<typeof action>>;
}

/**
 * @description Add-permission form using shadcn-ui Select; syncs selected value to a hidden input for form submission.
 */
function AddPermissionSelectForm(
  props: AddPermissionSelectFormProps,
): React.ReactElement {
  const { availablePermissions, fetcher } = props;

  // Hooks
  const [permissionId, setPermissionId] = React.useState<string>('');

  // Setup
  const Form = fetcher.Form;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Form method="post">
      <input name="intent" type="hidden" value="addPermission" />
      <input name="permissionId" type="hidden" value={permissionId} />
      <div className="flex items-center gap-2">
        <Select
          onValueChange={setPermissionId}
          value={permissionId || undefined}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Add permission…" />
          </SelectTrigger>
          <SelectContent>
            {availablePermissions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          disabled={fetcher.state !== 'idle' || !permissionId}
          size="sm"
          type="submit"
        >
          Add
        </Button>
      </div>
    </Form>
  );
}

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => _match.loaderData?.role?.name ?? 'Role Details',
  links: (_match) => [
    {
      children: 'Roles',
      to: '/roles',
    },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { request, params } = args;
  const roleId = params.roleId;

  if (!roleId) {
    throw new Response('Not found', { status: 404 });
  }

  try {
    const [roleResult, permissionsResult] = await Promise.all([
      executeGraphqlWithAuth(request, GetRoleDocument, { id: roleId }),
      executeGraphqlWithAuth(request, GetPermissionsDocument, {}),
    ]);

    return {
      permissions: permissionsResult.permissions,
      role: roleResult.role ?? null,
    };
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

export const meta = ({ loaderData }: Route.MetaArgs) => {
  const role = loaderData?.role;
  const title = role?.name
    ? `${role.name} | Roles | ${SITE_TITLE}`
    : `Role | ${SITE_TITLE}`;
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
  const role = loaderData?.role ?? null;
  const permissions = loaderData?.permissions ?? [];

  const UpdateForm = fetcher.Form;
  const RemovePermissionForm = fetcher.Form;
  const DeleteForm = fetcher.Form;

  const rolePermissionIds = new Set(role?.permissions.map((p) => p.id));
  const availablePermissions = permissions.filter(
    (p) => !rolePermissionIds.has(p.id),
  );

  const success =
    actionData != null && 'ok' in actionData && actionData.ok === true;

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (success) setEditOpen(false);

    // 🪝 On success we close the edit modal
  }, [success]);

  // 🔌 Short Circuit
  if (role == null) {
    return (
      <main className="mx-auto w-full max-w-7xl p-4 md:p-8 lg:p-12">
        <p className="text-muted-foreground">Role not found.</p>
      </main>
    );
  }

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={ShieldCheckIcon}
          title="Role Details"
        />
        <p className="text-muted-foreground text-sm">
          View and manage role details.
        </p>
      </div>

      <Card data-testid="role-detail">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl">{role.name}</CardTitle>
          <div className="flex gap-2">
            <Sheet onOpenChange={setEditOpen} open={editOpen}>
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
                      <Input
                        defaultValue={role.name}
                        id="edit-name"
                        name="name"
                      />
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
                    This will permanently delete this role and remove it from
                    all users. This action cannot be undone.
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
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <span className="text-muted-foreground text-sm">Description</span>
            <p>{role.description ?? '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">Updated</span>
            <p>{formatDate(role.updatedAt, 'MMM d, yyyy')}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Permissions</CardTitle>
          {availablePermissions.length > 0 ? (
            <AddPermissionSelectForm
              availablePermissions={availablePermissions}
              fetcher={fetcher}
            />
          ) : null}
        </CardHeader>
        <CardContent>
          {role.permissions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No permissions assigned. Add one above.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((p) => (
                <div className="flex items-center gap-1" key={p.id}>
                  <Badge variant="secondary">{p.name}</Badge>
                  <RemovePermissionForm method="post">
                    <input name="permissionId" type="hidden" value={p.id} />
                    <input
                      name="intent"
                      type="hidden"
                      value="removePermission"
                    />
                    <Button
                      aria-label={`Remove ${p.name}`}
                      disabled={fetcher.state !== 'idle'}
                      size="icon"
                      type="submit"
                      variant="ghost"
                    >
                      ×
                    </Button>
                  </RemovePermissionForm>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { request, params } = args;
  const roleId = params.roleId;

  if (!roleId) {
    return { error: 'Role not found' };
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'addPermission') {
      const permissionId = formData.get('permissionId');

      if (typeof permissionId === 'string' && permissionId) {
        await executeGraphqlWithAuth(request, AddPermissionToRoleDocument, {
          input: { permissionId, roleId },
        });

        return { ok: true };
      }
    }

    if (intent === 'deleteRole') {
      await executeGraphqlWithAuth(request, DeleteRoleDocument, { id: roleId });
      throw redirect('/roles');
    }

    if (intent === 'removePermission') {
      const permissionId = formData.get('permissionId');

      if (typeof permissionId === 'string' && permissionId) {
        await executeGraphqlWithAuth(
          request,
          RemovePermissionFromRoleDocument,
          { input: { permissionId, roleId } },
        );
        return { ok: true };
      }
    }

    if (intent === 'updateRole') {
      const name = formData.get('name');
      const description = formData.get('description');
      const hasDescription = typeof description === 'string';
      const hasName = typeof name === 'string';

      await executeGraphqlWithAuth(request, UpdateRoleDocument, {
        input: {
          description: hasDescription ? description.trim() || null : undefined,
          id: roleId,
          name: hasName && name.trim() ? name.trim() : undefined,
        },
      });

      return { ok: true };
    }
  } catch (error) {
    // 🚨 Let redirects (and other Responses) escape — they are control flow, not failures.
    if (error instanceof Response) {
      throw error;
    }

    const isError = error instanceof Error;
    const message = isError ? error.message : 'Action failed';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
