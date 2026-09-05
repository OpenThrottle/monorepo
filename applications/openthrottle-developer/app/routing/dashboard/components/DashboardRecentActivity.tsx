import * as React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import {
  activityDetailHref,
  commitLinkAriaLabel,
  outputLinkAriaLabel,
  planCellContent,
  taskLinkAriaLabel,
  toActivityRows,
} from '~/routing/dashboard/utils/recent-activity';
import type { DashboardActivityCardFragment } from '~/__generated__/graphql';

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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx(className)} data-testid="DashboardRecentActivity">
      <h2 className="mb-4">Recent Activity</h2>

      {activityRows.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="DashboardRecentActivity-empty"
        >
          No recent activity.
        </p>
      ) : (
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
            {activityRows.map((row) => {
              const href = activityDetailHref(row);
              const isCommitWithLink = row.type === 'commit' && href != null;
              const isOutputWithLink = row.type === 'output' && href != null;
              const isTaskWithLink = row.type === 'task' && href != null;
              const content = planCellContent(row);

              const planCell = isCommitWithLink ? (
                <Link
                  aria-label={commitLinkAriaLabel(row)}
                  className="line-clamp-2"
                  to={href}
                  viewTransition={true}
                >
                  {content}
                </Link>
              ) : isTaskWithLink ? (
                <Link
                  aria-label={taskLinkAriaLabel(row)}
                  className="line-clamp-2"
                  to={href}
                  viewTransition={true}
                >
                  {content}
                </Link>
              ) : isOutputWithLink ? (
                <Link
                  aria-label={outputLinkAriaLabel(row)}
                  className="line-clamp-2"
                  to={href}
                  viewTransition={true}
                >
                  {content}
                </Link>
              ) : (
                content
              );

              const statusBadge =
                row.type === 'task' &&
                row.status != null &&
                isPlanStatusKey(row.status) ? (
                  <PlanStatusBadge status={row.status} />
                ) : null;

              return (
                <TableRow key={row.id}>
                  <TableCell className="align-top">{statusBadge}</TableCell>
                  <TableCell className="overflow-hidden text-xs">
                    {planCell}
                    {/* {formatActivityDate(row.date)} */}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
