import {
  cn,
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { DashboardActivityCardFragment } from '~/__generated__/graphql';
import { DashboardRecentActivityRow } from '~/routing/dashboard/components/DashboardRecentActivityRow';
import { toActivityRows } from '~/routing/dashboard/utils/recent-activity';

export interface DashboardRecentActivityProps {
  className?: string;
  data: DashboardActivityCardFragment;
}

export const DashboardRecentActivity = (
  props: DashboardRecentActivityProps,
): React.ReactElement => {
  const { className, data } = props;

  // Hooks

  // Setup
  const activityRows = toActivityRows(data);
  const isEmpty = activityRows.length === 0;

  // Handlers

  // Markup
  const emptyMarkup = (
    <p
      className="text-muted-foreground text-sm"
      data-testid="DashboardRecentActivity-empty"
    >
      No recent activity.
    </p>
  );
  const tableMarkup = (
    <Table className="[&_tr]:hover:text-accent">
      <TableCaption className="sr-only">
        Recent activity: type, date, and plan
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead align="left" className="pb-2" scope="col">
            Status
          </TableHead>
          <TableHead align="left" className="pb-2" scope="col">
            Plan
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activityRows.map((row) => (
          <DashboardRecentActivityRow key={row.id} row={row} />
        ))}
      </TableBody>
    </Table>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)} data-testid="DashboardRecentActivity">
      <h2 className="mb-4">Recent Activity</h2>

      {isEmpty ? emptyMarkup : tableMarkup}
    </div>
  );
};
