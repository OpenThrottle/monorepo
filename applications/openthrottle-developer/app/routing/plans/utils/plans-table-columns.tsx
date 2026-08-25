/**
 * @description Column definitions for {@link PlansTable}. Hoisted from the
 * component file per component-primitive-shape R4 (module-scope helpers live in
 * the sibling utils/ folder) so the table component stays UI-focused.
 */
import * as React from 'react';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { GlobalPopoverActionsHeader } from '@openthrottle/react-router-ui-global';
import { formatDate } from 'date-fns';
import { SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import {
  isPlanStatusKey,
  PlanStatusBadge,
} from '~/routing/plans/components/PlanStatusBadge';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { PlansTableRowActions } from '~/routing/plans/components/PlansTableRowActions';
import { PLANS_DETAIL_TAB_SEARCH_PARAM } from '~/routing/plans/utils/parsers';
import type { PlanStatusKey } from '~/routing/plans/types';
import type { ColumnDef } from '@tanstack/react-table';
import type { PlanCardFragment } from '~/__generated__/graphql';
import type { PlansTableProps } from '~/routing/plans/components/PlansTable';

export const buildPlansTableColumns = (
  _statusFilterUrls: PlansTableProps['statusFilterUrls'],
): ColumnDef<PlanCardFragment, string | number | null | undefined>[] => {
  return [
    {
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;
        const statusKey: PlanStatusKey = isPlanStatusKey(status)
          ? status
          : 'PENDING';

        return (
          <div className="p-2">
            <Link to={`/plans?status=${status}`} viewTransition={true}>
              <PlanStatusBadge status={statusKey} />
            </Link>
          </div>
        );
      },
      header: () => <div className="p-2">Status</div>,
    },
    {
      accessorKey: 'details',
      cell: ({ row }) => {
        const plan = row.original;
        const planHref = `/plans/${plan.id}`;
        const configurationHref = `${planHref}?${PLANS_DETAIL_TAB_SEARCH_PARAM}=configuration`;
        const title = plan.title ?? 'Untitled';
        const taskCount = plan.taskCount ?? 0;
        const tags = plan.tags ?? [];

        const updatedAt = formatDate(
          plan.updatedAt ?? plan.createdAt,
          'MM/dd/yyyy',
        );

        return (
          <div className="flex flex-col gap-4 overflow-hidden p-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="line-clamp-1 min-w-0 text-sm font-medium text-ellipsis">
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
              </div>

              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span
                  aria-label={`${taskCount} tasks`}
                  className="tabular-nums"
                >
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </span>

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

                <span>Updated: {updatedAt}</span>
              </div>
            </div>

            {tags.length ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    aria-label={`Tag: ${tag.tag}`}
                    className={
                      tag.dimension === 'phase'
                        ? 'border-amber-500/60 bg-amber-500/10'
                        : undefined
                    }
                    color="slate"
                    key={`${tag.dimension}:${tag.tag}`}
                    size="xs"
                  >
                    {tag.tag}
                  </Badge>
                ))}
              </div>
            ) : null}

            {plan.summary ? (
              <div className="flex flex-wrap items-center gap-2">
                <MarkdownRenderer
                  className="m-0 line-clamp-2 overflow-hidden [&_p]:!mb-0"
                  source={plan.summary}
                />
              </div>
            ) : null}
          </div>
        );
      },
      header: () => <div className="p-2">Plan Details</div>,
    },
    {
      cell: ({ row }) => {
        return (
          <div className="flex items-center justify-center">
            <PlansTableRowActions plan={row.original} />
          </div>
        );
      },
      header: () => <GlobalPopoverActionsHeader />,
      id: 'actions',
    },
  ];
};
