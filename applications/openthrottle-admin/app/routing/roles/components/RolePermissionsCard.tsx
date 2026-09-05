import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { AddPermissionSelectForm } from '~/routing/roles/components/AddPermissionSelectForm';
import type { action as roleDetailAction } from '~/routes/roles.$roleId';
import type { Route } from '@/app/routes/+types/roles.$roleId';
import type { useFetcher } from 'react-router';
import type { RoleDetailsFragment } from '~/__generated__/graphql';

type LoaderData = Route.ComponentProps['loaderData'];

export interface RolePermissionsCardProps {
  availablePermissions: LoaderData['permissions'];
  fetcher: ReturnType<typeof useFetcher<typeof roleDetailAction>>;
  permissions: RoleDetailsFragment['permissions'];
}

export const RolePermissionsCard = (
  props: RolePermissionsCardProps,
): React.ReactElement => {
  const { availablePermissions, fetcher, permissions } = props;

  // Hooks

  // Setup
  const RemovePermissionForm = fetcher.Form;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
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
        {permissions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No permissions assigned. Add one above.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {permissions.map((p) => (
              <div className="flex items-center gap-1" key={p.id}>
                <Badge variant="secondary">{p.name}</Badge>
                <RemovePermissionForm method="post">
                  <input name="permissionId" type="hidden" value={p.id} />
                  <input name="intent" type="hidden" value="removePermission" />
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
  );
};
