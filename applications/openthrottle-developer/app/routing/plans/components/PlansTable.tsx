import * as React from 'react';
import clsx from 'clsx';
import { action as planDetailAction } from '~/routes/plans.$planId._index';
import { ArrowRightIcon, SlidersHorizontal } from 'lucide-react';
import {
  Button,
  DataTable,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import { getPlanIsCancelable } from '~/routing/plans/utils/utils.plans';
import { KillPlanRunButton } from '~/routing/plans/components/KillPlanRunButton';
import { Link, useFetcher, useSearchParams } from 'react-router';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import { PlanStatusKey } from '~/routing/plans/types';
import { PlanTasksEmpty } from '~/routing/plans/components/PlanTasksEmpty';
import { PLANS_DETAIL_TAB_SEARCH_PARAM } from '~/routing/plans/utils/parsers';
import type { ColumnDef } from '@tanstack/react-table';
import type { PlanCardFragment } from '~/__generated__/graphql';

export interface PlansTableProps {
  className?: string;
  plans: PlanCardFragment[];
  /** When set, status pills link to filter by that status (e.g. ?status=PENDING). Key = status value. */
  statusFilterUrls?: Record<string, string>;
}

export const PlansTable = (props: PlansTableProps): React.ReactElement => {
  const { className, plans, statusFilterUrls } = props;

  // Hooks
  const runPlanFetcher = useFetcher<typeof planDetailAction>();
  const [searchParams] = useSearchParams();

  // Setup
  const search = searchParams.get('q') ?? '';
  const columns = React.useMemo(
    () => PlansTable.buildTable(statusFilterUrls, runPlanFetcher),
    [plans, runPlanFetcher, statusFilterUrls],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('ui-border rounded-lg border', className)}
      data-testid="PlansTable"
    >
      <DataTable<PlanCardFragment, string | number | null | undefined>
        columns={columns}
        data={plans}
        emptyState={<PlanTasksEmpty search={search} />}
      />
    </div>
  );
};

PlansTable.buildTable = (
  _statusFilterUrls: PlansTableProps['statusFilterUrls'],
  runPlanFetcher: ReturnType<typeof useFetcher<typeof planDetailAction>>,
): ColumnDef<PlanCardFragment, string | number | null | undefined>[] => {
  return [
    // {
    //   accessorKey: 'status',
    //   cell: ({ row }) => {
    //     const status = row.original.status;
    //     const statusRaw = status ?? '';
    //     const statusKey: PlanStatusKey = isPlanStatusKey(statusRaw)
    //       ? statusRaw
    //       : 'PENDING';

    //     const isNull = status === null;
    //     const url = !isNull ? statusFilterUrls?.[status] : undefined;
    //     const badge = <PlanStatusBadge status={statusKey} />;

    //     if (!url) {
    //       return badge;
    //     }

    //     return (
    //       <div className="text-center">
    //         <Link
    //           aria-label={`Filter by ${getPlanStatusLabel(status)}`}
    //           to={url}
    //           viewTransition={true}
    //         >
    //           {badge}
    //         </Link>
    //       </div>
    //     );
    //   },
    //   header: () => (
    //     <span className="inline-block w-full text-center">Status</span>
    //   ),
    // },
    {
      accessorKey: 'taskCount',
      cell: ({ row }) => {
        const count = row.original.taskCount ?? 0;
        return (
          <div
            aria-label={`${count} tasks`}
            className="w-full p-2 text-center tabular-nums"
          >
            {count}
          </div>
        );
      },
      header: () => <span className="p-2 text-center">Tasks</span>,
    },
    {
      accessorKey: 'status',
      cell: ({ row }) => (
        <div className="p-2">
          <Link
            // className="mx-auto"
            to={`/plans?status=${row.original.status}`}
            viewTransition={true}
          >
            <PlanStatusBadge status={row.original.status as PlanStatusKey} />
          </Link>
        </div>
      ),
      header: () => <div className="p-2">Status</div>,
    },

    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const plan = row.original;
        const planHref = `/plans/${plan.id}`;
        const configurationHref = `${planHref}?${PLANS_DETAIL_TAB_SEARCH_PARAM}=configuration`;
        const title = plan.title ?? 'Untitled';

        return (
          <div className="overflow-hidden p-2">
            <h2 className="mb-2 line-clamp-1 text-sm font-medium text-ellipsis">
              <Link
                aria-label={`View plan: ${title}`}
                className="hover:text-primary underline underline-offset-2"
                data-testid="plan-list-title-link"
                to={planHref}
                viewTransition={true}
              >
                {title}
              </Link>
            </h2>
            <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {plan.hasCustomRunConfig ? (
                <Tooltip>
                  <TooltipTrigger asChild={true}>
                    <Link
                      aria-label="Custom workflow run configuration (differs from defaults)"
                      className="text-muted-foreground hover:text-foreground inline-flex shrink-0"
                      to={configurationHref}
                      viewTransition={true}
                    >
                      <SlidersHorizontal
                        aria-hidden={true}
                        className="size-3.5"
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs" side="top">
                    Custom workflow run configuration (differs from defaults).
                    Open the Configuration tab to view or edit.
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {plan.projectRelation != null ? (
                <Link
                  aria-label={`Project: ${plan.projectRelation.name}`}
                  className="underline underline-offset-2"
                  to={`/projects/${plan.projectRelation.id}`}
                  viewTransition={true}
                >
                  {plan.projectRelation.name}
                </Link>
              ) : plan.project != null && plan.project !== '' ? (
                <span
                  aria-label={`Project: ${plan.project}`}
                  className="border-border rounded border px-1.5 py-0.5"
                >
                  {plan.project}
                </span>
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
              <span>
                Updated:{' '}
                {formatDate(plan.updatedAt ?? plan.createdAt, 'MM/dd/yyyy')}
              </span>
            </div>
          </div>
        );
      },
      header: () => <div className="p-2">Plan</div>,
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
                {/* Plan Details */}
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <KillPlanRunButton
              planId={planId}
              planTitle={row.original.title ?? 'Untitled'}
              show={getPlanIsCancelable(row.original.status)}
              size="xs"
            />
            <RunPlanForm action={`/plans/${planId}`} method="post">
              <Input name="intent" type="hidden" value="runPlan" />
              <Button
                aria-label={`Queue plan ${row.original.title} with default worker tuning (open plan details to set Workflow run options)`}
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
};
