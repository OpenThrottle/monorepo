import { TableCell, TableRow } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import {
  activityDetailHref,
  type ActivityRow,
  commitLinkAriaLabel,
  outputLinkAriaLabel,
  planCellContent,
  taskLinkAriaLabel,
} from '~/routing/dashboard/utils/recent-activity';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';

const LINK_ARIA_LABEL_BY_TYPE = {
  commit: commitLinkAriaLabel,
  output: outputLinkAriaLabel,
  task: taskLinkAriaLabel,
} as const;

export interface DashboardRecentActivityRowProps {
  row: ActivityRow;
}

/**
 * @description One recent-activity table row: a status badge for task rows and a
 * plan cell that links to the commit, task, or output when a destination exists.
 */
export const DashboardRecentActivityRow = (
  props: DashboardRecentActivityRowProps,
): React.ReactElement => {
  const { row } = props;

  // Hooks

  // Setup
  const href = activityDetailHref(row);
  const content = planCellContent(row);

  // Handlers
  const renderPlanCell = (): React.ReactNode => {
    if (href == null) {
      return content;
    }
    return (
      <Link
        aria-label={LINK_ARIA_LABEL_BY_TYPE[row.type](row)}
        className="line-clamp-2"
        to={href}
        viewTransition={true}
      >
        {content}
      </Link>
    );
  };

  const renderStatusBadge = (): React.ReactNode => {
    if (
      row.type === 'task' &&
      row.status != null &&
      isPlanStatusKey(row.status)
    ) {
      return <PlanStatusBadge status={row.status} />;
    }
    return null;
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TableRow>
      <TableCell className="align-top">{renderStatusBadge()}</TableCell>
      <TableCell className="overflow-hidden text-xs">
        {renderPlanCell()}
      </TableCell>
    </TableRow>
  );
};
