import * as React from 'react';
import { redirect, useFetcher } from 'react-router';
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
  GetPermissionsDocument,
  GetRoleDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { RoleDetailCard } from '~/routing/roles/components/RoleDetailCard';
import { RolePermissionsCard } from '~/routing/roles/components/RolePermissionsCard';
import { runRoleDetailAction } from '~/routing/roles/actions/roleId';
import { ShieldCheckIcon } from 'lucide-react';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/roles.$roleId';

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

      <RoleDetailCard
        editOpen={editOpen}
        fetcher={fetcher}
        onEditOpenChange={setEditOpen}
        role={role}
      />

      <RolePermissionsCard
        availablePermissions={availablePermissions}
        fetcher={fetcher}
        permissions={role.permissions}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) =>
  runRoleDetailAction(args.request, args.params.roleId);

export const ErrorBoundary = GlobalErrorBoundary;
