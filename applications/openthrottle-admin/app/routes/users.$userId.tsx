import * as React from 'react';
import { redirect, useFetcher } from 'react-router';
import {
  executeGraphqlWithAuth,
  isAuthError,
} from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  GetRolesForUserDocument,
  GetUserDocument,
  ListRolesForAssignDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { runUserDetailAction } from '~/routing/users/actions/userId';
import { SITE_TITLE } from '~/global/config/settings';
import { UserDetailSummary } from '~/routing/users/components/UserDetailSummary';
import { UserEditSheet } from '~/routing/users/components/UserEditSheet';
import { UserIcon } from 'lucide-react';
import { UserRolesCard } from '~/routing/users/components/UserRolesCard';
import { UserStatusActions } from '~/routing/users/components/UserStatusActions';
import type { Route } from '@/app/routes/+types/users.$userId';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) =>
    _match.loaderData?.user?.githubUsername ?? 'User Details',
  links: (_match) => [
    {
      children: 'Users',
      to: '/users',
    },
  ],
};

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
      <main className="mx-auto w-full max-w-7xl p-4 md:p-8 lg:p-12">
        <p className="text-muted-foreground">User not found.</p>
      </main>
    );
  }

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={UserIcon}
          title="User Details"
        />
        <p className="text-muted-foreground text-sm">
          View and manage user details.
        </p>
      </div>

      <OpenThrottleFieldset
        icon={UserIcon}
        id="user-detail"
        legend={user.githubUsername}
      >
        <UserDetailSummary isDisabled={isDisabled} user={user} />

        <div className="flex flex-wrap items-center gap-2">
          <UserEditSheet
            fetcher={fetcher}
            onOpenChange={setEditOpen}
            open={editOpen}
            user={user}
          />
          <UserStatusActions fetcher={fetcher} isDisabled={isDisabled} />
        </div>

        <UserRolesCard
          availableRoles={availableRoles}
          fetcher={fetcher}
          rolesForUser={rolesForUser}
        />
      </OpenThrottleFieldset>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) =>
  runUserDetailAction(args.request, args.params.userId);

export const ErrorBoundary = GlobalErrorBoundary;
