/**
 * @description Column definitions for {@link PlansTable}. Hoisted from the
 * component file per component-primitive-shape R4 (module-scope helpers live in
 * the sibling utils/ folder) so the table component stays UI-focused.
 */

import type { DataTableColumnDef } from '@openthrottle/react-router-shadcn';
import {
  cn,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { SlidersHorizontal } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { PlanCardFragment } from '~/__generated__/graphql';
import type { PlansTableProps } from '~/routing/plans/components/PlansTable';
import { PlanStatusBadge } from '~/routing/plans/components/PlanStatusBadge';
import {
  MOBILE_CARD_BLOCK_CLASS,
  MOBILE_CARD_TITLE_CLASS,
} from '~/routing/plans/data/mobile-card';
import type { PlanStatusKey } from '~/routing/plans/types';
import { PLANS_DETAIL_TAB_SEARCH_PARAM } from '~/routing/plans/utils/parsers';
import { isPlanStatusKey } from '~/routing/plans/utils/utils.plans';

const renderCustomRunConfigIndicator = (
  plan: PlanCardFragment,
  configurationHref: string,
): React.ReactNode => {
  if (!plan.hasCustomRunConfig) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <Link
          aria-label="Custom workflow run configuration (differs from defaults)"
          className="text-muted-foreground hover:text-foreground inline-flex shrink-0 py-2 pr-2 max-sm:p-0"
          prefetch="intent"
          to={configurationHref}
        >
          <SlidersHorizontal aria-hidden={true} className="size-3.5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs" side="top">
        Custom workflow run configuration (differs from defaults). Open the
        Configuration tab to view or edit.
      </TooltipContent>
    </Tooltip>
  );
};

export const buildPlansTableColumns = (
  _statusFilterUrls: PlansTableProps['statusFilterUrls'],
): DataTableColumnDef<
  PlanCardFragment,
  string | number | null | undefined
>[] => {
  return [
    {
      accessorKey: 'status',
      cell: ({ row }) => {
        const status = row.original.status;
        const statusKey: PlanStatusKey = isPlanStatusKey(status)
          ? status
          : 'PENDING';

        return (
          <div className="p-2 max-sm:p-0">
            <Link to={`/plans?status=${status}`}>
              <PlanStatusBadge
                scheduledRunAt={row.original.scheduledRunAt}
                status={statusKey}
              />
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
        // `prefetch="intent"` on the plan links below warms PlanDetailCritical
        // on hover/focus, so the click usually paints without a round trip. It is
        // affordable only because that query is now small — the slow
        // workspaceRepositories field is deferred and is NOT prefetched here.
        // `intent` rather than `render`: `render` would fire one loader per row
        // on a long plans table.
        const planHref = `/plans/${plan.id}`;
        const configurationHref = `${planHref}?${PLANS_DETAIL_TAB_SEARCH_PARAM}=configuration`;
        const title = plan.title ?? 'Untitled';
        const taskCount = plan.taskCount ?? 0;
        const tasksCompletedCount = plan.tasksCompletedCount ?? 0;

        // The whole title + task-count block is one link to the plan, and it
        // grows (`flex-1`) and carries the cell padding so the entire details
        // cell is its click target. The custom-run-config indicator is its own
        // link, so it sits beside the block rather than inside it (an `<a>` may
        // not contain another `<a>`); it keeps its intrinsic width and takes the
        // cell's right/vertical padding, so spacing matches the old `p-2 gap-2`.
        return (
          <div className="flex items-start overflow-hidden max-sm:contents">
            <Link
              aria-label={`View plan: ${title}`}
              className="hover:text-primary min-w-0 flex-1 p-2 max-sm:contents"
              data-testid="plan-list-title-link"
              prefetch="intent"
              to={planHref}
            >
              <h2
                className={cn(
                  'line-clamp-1 min-w-0 text-sm font-medium text-ellipsis max-sm:line-clamp-2',
                  MOBILE_CARD_TITLE_CLASS,
                )}
              >
                {title}
              </h2>

              <span
                aria-label={`${tasksCompletedCount} of ${taskCount} tasks resolved`}
                className={cn(
                  'text-muted-foreground mt-1 block text-xs tabular-nums',
                  MOBILE_CARD_BLOCK_CLASS.meta,
                )}
              >
                {tasksCompletedCount}/{taskCount}{' '}
                {taskCount === 1 ? 'task' : 'tasks'}
              </span>
            </Link>

            {renderCustomRunConfigIndicator(plan, configurationHref)}
          </div>
        );
      },
      header: () => <div className="p-2">Plan Details</div>,
    },
  ];
};
