import * as React from 'react';
import { Link } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { AssignRoleSelectForm } from '~/routing/users/components/AssignRoleSelectForm';
import type { action as userDetailAction } from '~/routes/users.$userId';
import type { Route } from '@/app/routes/+types/users.$userId';
import type { useFetcher } from 'react-router';

type LoaderData = Route.ComponentProps['loaderData'];

export interface UserRolesCardProps {
  availableRoles: LoaderData['rolesList'];
  fetcher: ReturnType<typeof useFetcher<typeof userDetailAction>>;
  rolesForUser: LoaderData['rolesForUser'];
}

export const UserRolesCard = (
  props: UserRolesCardProps,
): React.ReactElement => {
  const { availableRoles, fetcher, rolesForUser } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
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
                  className="hover:text-primary font-medium underline underline-offset-2"
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
  );
};
