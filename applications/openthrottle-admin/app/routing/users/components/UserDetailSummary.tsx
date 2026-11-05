import { Badge } from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import * as React from 'react';

import type { UserDetailsFragment } from '~/__generated__/graphql';
import { formatOptionalDate } from '~/routing/users/utils/format-optional-date';

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
  const updatedLabel = formatOptionalDate(user.updatedAt);
  const disabledLabel = formatOptionalDate(user.disabledAt);

  // Handlers

  // Markup
  const updatedAt = (
    <div>
      <span className="text-muted-foreground text-sm">Updated</span>
      <p>{updatedLabel}</p>
    </div>
  );
  const disabledAt = (
    <div>
      <span className="text-muted-foreground text-sm">Disabled at</span>
      <p>{disabledLabel}</p>
    </div>
  );

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

        {user.updatedAt ? updatedAt : null}

        {user.disabledAt ? disabledAt : null}
      </div>
    </div>
  );
};
