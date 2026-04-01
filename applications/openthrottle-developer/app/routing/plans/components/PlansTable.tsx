import * as React from 'react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { Link, useFetcher } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDate } from 'date-fns';
import { PLAN_STATUS_FILTER_OPTIONS } from '~/routing/plans/config/status-options';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import type { PlanCardFragment } from '~/__generated__/graphql';
import { action as planDetailAction } from '~/routes/plans.$planId._index';

const SUMMARY_TRUNCATE_LENGTH = 80;

export interface PlansTableProps {
  className?: string;
  plans: PlanCardFragment[];
  /** When set, status pills link to filter by that status (e.g. ?status=PENDING). Key = status value. */
  statusFilterUrls?: Record<string, string>;
}

function getStatusLabel(status: string | null | undefined): string {
  if (status == null) return 'Unknown';
  const opt = PLAN_STATUS_FILTER_OPTIONS.find((o) => o.value === status);
  return opt?.label ?? status;
}

function buildPlanTableColumns(
  statusFilterUrls: PlansTableProps['statusFilterUrls'],
  runPlanFetcher: ReturnType<typeof useFetcher<typeof planDetailAction>>,
): ColumnDef<PlanCardFragment, string | number | null | undefined>[] {
  return [
    {
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;
        const badge = (
          <PlanStatusBadge
            status={status as Parameters<typeof PlanStatusBadge>[0]['status']}
          />
        );
        const url = status != null ? statusFilterUrls?.[status] : undefined;
        if (url) {
          return (
            <Link
              aria-label={`Filter by ${getStatusLabel(status)}`}
              to={url}
              viewTransition={true}
            >
              {badge}
            </Link>
          );
        }
        return badge;
      },
      header: () => (
        <span className="inline-block w-full text-center">Status</span>
      ),
    },
    {
      accessorKey: 'taskCount',
      cell: ({ row }) => {
        const count = row.original.taskCount ?? 0;
        return (
          <span aria-label={`${count} tasks`} className="tabular-nums">
            {count}
          </span>
        );
      },
      header: () => (
        <span className="inline-block w-full text-center">Tasks</span>
      ),
    },
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const plan = row.original;
        const planHref = `/plans/${plan.id}`;
        const title = plan.title ?? 'Untitled';
        return (
          <div className="overflow-hidden">
            <h2 className="text-sm line-clamp-1 text-ellipsis font-medium">
              <Link
                aria-label={`View plan: ${title}`}
                className="underline underline-offset-2 hover:text-primary"
                to={planHref}
                viewTransition={true}
              >
                {title}
              </Link>
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {plan.projectRelation != null ? (
                <Link
                  aria-label={`Project: ${plan.projectRelation.name}`}
                  className="underline underline-offset-2"
                  to={`/projects/${plan.projectRelation.id}`}
                  viewTransition={true}
                >
                  {plan.projectRelation.name}
                </Link>
              ) : null}
              {plan.author ? (
                <span aria-label={`Author: ${plan.author}`}>
                  {plan.assignee
                    ? `${plan.author} → ${plan.assignee}`
                    : plan.author}
                </span>
              ) : plan.assignee ? (
                <span aria-label={`Assignee: ${plan.assignee}`}>
                  Assignee: {plan.assignee}
                </span>
              ) : null}
              {plan.category ? (
                <Badge
                  aria-label={`Category: ${plan.category}`}
                  size="sm"
                  variant="secondary"
                >
                  {plan.category}
                </Badge>
              ) : null}
              <span>
                Updated:{' '}
                {formatDate(plan.updatedAt ?? plan.createdAt, 'MM/dd/yyyy')}
              </span>
            </div>
            {plan.summary ? (
              <Tooltip>
                <TooltipTrigger asChild={true}>
                  <p
                    className="mt-0.5 line-clamp-1 text-ellipsis text-xs text-muted-foreground"
                    title={plan.summary}
                  >
                    {plan.summary.length > SUMMARY_TRUNCATE_LENGTH
                      ? `${plan.summary.slice(0, SUMMARY_TRUNCATE_LENGTH)}…`
                      : plan.summary}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top">{plan.summary}</TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        );
      },
      header: () => 'Plan',
    },
    {
      cell: ({ row }) => {
        const planId = row.original.id;
        const isQueuing = runPlanFetcher.state !== 'idle';
        const RunPlanForm = runPlanFetcher.Form;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild={true}
              className="text-xs"
              size="xs"
              variant="outline"
            >
              <Link to={`/plans/${planId}`} viewTransition={true}>
                Plan Details
              </Link>
            </Button>
            <RunPlanForm action={`/plans/${planId}`} method="post">
              <input name="intent" type="hidden" value="runPlan" />
              <Button
                aria-label={`Queue plan ${row.original.title}`}
                className="text-xs"
                disabled={isQueuing}
                size="xs"
                type="submit"
                variant="outline"
              >
                {isQueuing ? 'Queuing…' : 'Queue Plan'}
              </Button>
            </RunPlanForm>
          </div>
        );
      },
      header: () => 'Actions',
      id: 'actions',
    },
  ];
}

export const PlansTable = (props: PlansTableProps) => {
  const { className, plans, statusFilterUrls } = props;
  const runPlanFetcher = useFetcher<typeof planDetailAction>();
  const columns = React.useMemo(
    () => buildPlanTableColumns(statusFilterUrls, runPlanFetcher),
    [statusFilterUrls, runPlanFetcher],
  );

  return (
    <Card className={className} data-testid="PlansTable">
      <TooltipProvider>
        <DataTable<PlanCardFragment, string | number | null | undefined>
          columns={columns}
          data={plans}
        />
      </TooltipProvider>
    </Card>
  );
};
