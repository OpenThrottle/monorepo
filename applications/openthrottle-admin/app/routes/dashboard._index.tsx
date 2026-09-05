import * as React from 'react';
import { Link } from 'react-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { GaugeCircleIcon } from 'lucide-react';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { ADMIN_PATHS } from '~/global/data/data.navigation';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/dashboard._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Dashboard',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

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
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={GaugeCircleIcon}
          title="Dashboard"
        />
        <p className="text-muted-foreground text-sm">
          Get a pulse of all your Plans, Tasks, PR's, Prompts, Skills, and more
          coming soon.
        </p>
      </div>

      <div className="flex w-full flex-1 flex-col gap-4">
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
              <p className="text-muted-foreground text-sm">
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
              <p className="text-muted-foreground text-sm">
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
              <p className="text-muted-foreground text-sm">
                View users and assign roles. Server metrics are shown below.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
