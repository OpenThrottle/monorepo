import * as React from 'react';
import { redirect } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GetPermissionsDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { PermissionsTable } from '~/routing/permissions/components/PermissionsTable';
import type { Route } from '@/app/routes/+types/permissions._index';

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  try {
    const data = await executeGraphqlWithAuth(request, GetPermissionsDocument);

    return { permissions: data.permissions };
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : String(error);

    if (isError && (message.includes('401') || message.includes('403'))) {
      return redirect('/');
    }

    throw error;
  }
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Permissions | ${SITE_TITLE}` }];
});

export default function Component(
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
    <GlobalScreen>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl text-highlight">Permissions</h1>
      </div>
      <p className="text-muted-foreground text-sm">
        System permissions that can be assigned to roles. Manage role-permission
        assignments on each role&apos;s detail page.
      </p>
      <PermissionsTable permissions={permissions} />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
