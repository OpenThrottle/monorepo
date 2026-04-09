import * as React from 'react';
import classnames from 'classnames';
import { formatDistanceToNow } from 'date-fns';
import { FileText, GitCommit, ListTodo } from 'lucide-react';
import { Link } from 'react-router';
import {
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { DashboardActivityCardFragment } from '~/__generated__/graphql';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';

export interface DashboardRecentActivityProps {
  className?: string;
  data: DashboardActivityCardFragment;
}

type ActivityRow = {
  date: string;
  description: string;
  id: string;
  planId?: string;
  planTitle: string | null;
  repo?: string;
  sha?: string;
  status: string | null;
  taskId?: string | null;
  taskTitle: string | null;
  type: 'commit' | 'output' | 'task';
};

function toActivityRows(data: DashboardActivityCardFragment): ActivityRow[] {
  const rows: ActivityRow[] = [];

  for (const c of data.commits) {
    rows.push({
      date: c.createdAt,
      description: c.message ?? '',
      id: c.id,
      planId: c.planId,
      planTitle: c.planTitle ?? null,
      repo: c.repo,
      sha: c.sha,
      status: null,
      taskId: c.taskId ?? null,
      taskTitle: c.taskTitle ?? null,
      type: 'commit',
    });
  }

  for (const o of data.outputChunks) {
    rows.push({
      date: o.createdAt,
      description: o.content?.slice(0, 80) ?? '',
      id: o.id,
      planId: o.planId,
      planTitle: o.planTitle ?? null,
      status: null,
      taskTitle: null,
      type: 'output',
    });
  }

  for (const t of data.tasksUpdated) {
    rows.push({
      date: t.updatedAt,
      description: t.title ?? '',
      id: t.id,
      planId: t.planId,
      planTitle: t.planTitle ?? null,
      status: t.status,
      taskId: t.id,
      taskTitle: null,
      type: 'task',
    });
  }

  rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return rows.slice(0, 20);
}

const TYPE_ICON_MAP: Record<
  ActivityRow['type'],
  {
    ariaLabel: string;
    Icon: React.ComponentType<{ 'aria-hidden'?: boolean; className?: string }>;
  }
> = {
  commit: { Icon: GitCommit, ariaLabel: 'Commit' },
  output: { Icon: FileText, ariaLabel: 'Output' },
  task: { Icon: ListTodo, ariaLabel: 'Task' },
};

/**
 * @description Renders the activity type icon with accessible label.
 */
function TypeIcon({ type }: { type: ActivityRow['type'] }): React.ReactElement {
  const { Icon, ariaLabel } = TYPE_ICON_MAP[type];

  return (
    <Icon
      aria-label={ariaLabel}
      className="h-4 w-4 shrink-0 text-muted-foreground"
      // role="img"
    />
  );
}

/**
 * @description Formats activity date as short date plus relative time (e.g. "2/12/25 · 2 hours ago").
 */
function formatActivityDate(dateStr: string): string {
  const date = new Date(dateStr);

  return `${date.toLocaleDateString('en-US', { dateStyle: 'short' })} · ${formatDistanceToNow(date, { addSuffix: true })}`;
}

/**
 * @description Builds human-readable Plan column content: repo, task context, and/or message.
 */
function planCellContent(row: ActivityRow): string {
  if (row.type === 'commit') {
    const parts = [
      row.repo,
      row.taskTitle ??
        row.description ??
        (row.sha ? `sha ${row.sha.slice(0, 7)}` : undefined),
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' — ') : '—';
  }

  if (row.type === 'output') {
    return row.planTitle != null ? `Output: ${row.planTitle}` : '—';
  }

  const parts = [row.planTitle, row.description].filter(Boolean);

  return parts.length > 0 ? parts.join(' — ') : '—';
}

/**
 * @description Builds plan or task detail URL for activity rows that have planId (and optional taskId).
 */
function activityDetailHref(row: ActivityRow): string | null {
  if (row.planId == null) return null;
  const base = `/plans/${row.planId}`;

  if (row.taskId != null && row.taskId !== '') {
    return `${base}#task-${row.taskId}`;
  }

  return base;
}

/**
 * @description Accessible label for commit link: plan or task context.
 */
function commitLinkAriaLabel(row: ActivityRow): string {
  const target = row.taskId ? 'task' : 'plan';
  const repo = row.repo ?? '';
  const context =
    row.taskTitle ?? (row.description ? row.description.slice(0, 40) : '');

  return `View ${target}${repo ? ` for ${repo}` : ''}${context ? `: ${context}` : ''}`;
}

/**
 * @description Accessible label for task-updated row link to task detail.
 */
function taskLinkAriaLabel(row: ActivityRow): string {
  const title = row.description ? row.description.slice(0, 50) : 'task';

  return `View task: ${title}`;
}

/**
 * @description Accessible label for output chunk row link to plan detail.
 */
function outputLinkAriaLabel(row: ActivityRow): string {
  const plan = row.planTitle ?? 'plan';
  const preview = row.description ? `: ${row.description.slice(0, 40)}` : '';

  return `View plan ${plan}${preview}`;
}

export const DashboardRecentActivity = (
  props: DashboardRecentActivityProps,
) => {
  const { className, data } = props;

  // Hooks

  // Setup
  const activityRows = toActivityRows(data);

  const VALID_TASK_STATUSES = [
    'BACKLOG',
    'BLOCKED',
    'CANCELED',
    'COMPLETED',
    'IN_PROGRESS',
    'PENDING',
    'QUEUED',
    'SKIPPED',
  ] as const;

  const isValidTaskStatus = (
    s: string | null,
  ): s is (typeof VALID_TASK_STATUSES)[number] =>
    s != null &&
    VALID_TASK_STATUSES.includes(s as (typeof VALID_TASK_STATUSES)[number]);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(className)}
      data-testid="DashboardRecentActivity"
    >
      <CardHeader>
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activityRows.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
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
                  Type
                </TableHead>
                <TableHead align="left" className="pb-2" scope="col">
                  Date
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
                    to={href}
                    viewTransition={true}
                  >
                    {content}
                  </Link>
                ) : isTaskWithLink ? (
                  <Link
                    aria-label={taskLinkAriaLabel(row)}
                    to={href}
                    viewTransition={true}
                  >
                    {content}
                  </Link>
                ) : isOutputWithLink ? (
                  <Link
                    aria-label={outputLinkAriaLabel(row)}
                    to={href}
                    viewTransition={true}
                  >
                    {content}
                  </Link>
                ) : (
                  content
                );

                const typeBadge = null;
                // const typeBadge = (
                //   <Badge size="sm" variant="secondary">
                //     {row.type}
                //   </Badge>
                // );
                const statusBadge =
                  row.type === 'task' &&
                  row.status != null &&
                  isValidTaskStatus(row.status) ? (
                    <PlanStatusBadge status={row.status as any} />
                  ) : null;

                return (
                  <TableRow key={row.id}>
                    <TableCell className="align-top">
                      <span className="flex items-center gap-2">
                        <TypeIcon type={row.type} />
                        {typeBadge}
                        {statusBadge}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground align-top text-sm">
                      {formatActivityDate(row.date)}
                    </TableCell>
                    <TableCell className="line-clamp-2 overflow-hidden text-sm">
                      {planCell}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </div>
  );
};
