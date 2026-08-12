import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import { RoleDeleteDialog } from '~/routing/roles/components/RoleDeleteDialog';
import { RoleEditSheet } from '~/routing/roles/components/RoleEditSheet';
import { action as roleDetailAction } from '~/routes/roles.$roleId';
import type { Route } from '@/app/routes/+types/roles.$roleId';
import type { useFetcher } from 'react-router';

type RoleDetail = NonNullable<Route.ComponentProps['loaderData']['role']>;

export interface RoleDetailCardProps {
  editOpen: boolean;
  fetcher: ReturnType<typeof useFetcher<typeof roleDetailAction>>;
  onEditOpenChange: (open: boolean) => void;
  role: RoleDetail;
}

export const RoleDetailCard = (
  props: RoleDetailCardProps,
): React.ReactElement => {
  const { editOpen, fetcher, onEditOpenChange, role } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="role-detail">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">{role.name}</CardTitle>
        <div className="flex gap-2">
          <RoleEditSheet
            fetcher={fetcher}
            onOpenChange={onEditOpenChange}
            open={editOpen}
            role={role}
          />
          <RoleDeleteDialog fetcher={fetcher} />
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
  );
};
