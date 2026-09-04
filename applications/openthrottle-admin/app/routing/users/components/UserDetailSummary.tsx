import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import type { UserDetailsFragment } from '~/__generated__/graphql';

export interface UserDetailSummaryProps {
  isDisabled: boolean;
  user: UserDetailsFragment;
}

export const UserDetailSummary = (
  props: UserDetailSummaryProps,
): React.ReactElement => {
  const { isDisabled, user } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="user-detail">
      <div className="grid gap-4">
        <div>
          <span className="text-muted-foreground text-sm">Email</span>
          <p>{user.email ?? '—'}</p>
        </div>
        <Badge color={isDisabled ? 'red' : 'green'}>
          {isDisabled ? 'Disabled' : 'Active'}
        </Badge>

        <div>
          <span className="text-muted-foreground text-sm">GitHub username</span>
          <p>{user.githubUsername}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Created</span>
          <p>{formatDate(user.createdAt, 'MMM d, yyyy')}</p>
        </div>

        {user.updatedAt ? (
          <div>
            <span className="text-muted-foreground text-sm">Updated</span>
            <p>{formatDate(user.updatedAt, 'MMM d, yyyy')}</p>
          </div>
        ) : null}

        {user.disabledAt ? (
          <div>
            <span className="text-muted-foreground text-sm">Disabled at</span>
            <p>{formatDate(user.disabledAt, 'MMM d, yyyy')}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};
