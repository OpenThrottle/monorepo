import * as React from 'react';
import { redirect } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GetPermissionsDocument } from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/permissions._index';
import { PermissionsTable } from '~/routing/permissions/components/PermissionsTable';

export interface PermissionsIndexLoaderData {
  permissions: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
}

// export const loader = async (args: Route.LoaderArgs) => {
//   return {};
// };

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  try {
    const data = await executeGraphqlWithAuth(request, GetPermissionsDocument);

    return { permissions: data.permissions };
  } catch (error) {
    const isError = error instanceof Error;
    const is401 = isError && error.message.includes('401');
    const is403 = isError && error.message.includes('403');

    if (is401 || is403) {
      return redirect('/');
    }

    throw error;
  }
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Permissions | ${SITE_TITLE}` }];
});

export default function PermissionsIndexPage(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const permissions = loaderData?.permissions ?? [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="mx-auto max-w-7xl w-full flex flex-col gap-6 p-4 md:p-8 lg:p-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl text-highlight">Permissions</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        System permissions that can be assigned to roles. Manage role-permission
        assignments on each role&apos;s detail page.
      </p>
      <PermissionsTable permissions={permissions} />
    </main>
  );
}

// export const action = async (args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
