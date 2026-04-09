import * as React from 'react';
import { Link } from 'react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { ADMIN_PATHS } from '~/global/data/data.navigation';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/dashboard._index';

// export const loader = async (_args: Route.LoaderArgs) => {
//   return {};
// };

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <main className="mx-auto max-w-7xl w-full flex flex-col gap-6 p-4 md:p-8 lg:p-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl text-highlight">Dashboard</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4 w-full">
        <section
          aria-label="Overview cards"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <Card data-testid="dashboard-card-permissions">
            <CardHeader>
              <CardTitle className="text-lg">
                <Link
                  className="hover:underline focus:underline"
                  to={ADMIN_PATHS.permissions}
                >
                  Permissions
                </Link>
              </CardTitle>
              <CardDescription>Manage permission definitions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage permission scopes used for role-based access.
              </p>
            </CardContent>
          </Card>
          <Card data-testid="dashboard-card-roles">
            <CardHeader>
              <CardTitle className="text-lg">
                <Link
                  className="hover:underline focus:underline"
                  to={ADMIN_PATHS.roles}
                >
                  Roles
                </Link>
              </CardTitle>
              <CardDescription>Manage roles</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create and assign roles with permissions for your organisation.
              </p>
            </CardContent>
          </Card>
          <Card data-testid="dashboard-card-users">
            <CardHeader>
              <CardTitle className="text-lg">
                <Link
                  className="hover:underline focus:underline"
                  to={ADMIN_PATHS.users}
                >
                  Users
                </Link>
              </CardTitle>
              <CardDescription>Manage users</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View users and assign roles. Server metrics are shown below.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
