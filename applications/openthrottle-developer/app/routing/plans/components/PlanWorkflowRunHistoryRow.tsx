import {
  Badge,
  Button,
  TableCell,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { ChevronRightIcon } from 'lucide-react';
import * as React from 'react';

import { PlanRunMetaList } from '~/routing/plans/components/PlanRunMetaList';
import { PlanRunProvenanceCell } from '~/routing/plans/components/PlanRunProvenanceCell';
import { PlanRunStatusCell } from '~/routing/plans/components/PlanRunStatusCell';
import { PlanRunTime } from '~/routing/plans/components/PlanRunTime';
import { PlanWorkflowRunHistoryDetail } from '~/routing/plans/components/PlanWorkflowRunHistoryDetail';
import { PlanWorkflowRunHistoryRowActions } from '~/routing/plans/components/PlanWorkflowRunHistoryRowActions';
import type { PlanRunAuditRow } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import {
  PLAN_RUN_HISTORY_COLUMN_COUNT,
  PLAN_RUN_HISTORY_META_FIELDS,
} from '~/routing/plans/data/data.plan-run-history';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { buildPlanRunMetaItems } from '~/routing/plans/utils/plan-run-sections';

export interface PlanWorkflowRunHistoryRowProps {
  /** A continuation run exists for this run (see `collectResumedRunIds`). */
  readonly resumeScheduled: boolean;
  readonly row: PlanRunAuditRow;
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workingDirectory: string;
}

/**
 * @description One Run history run: a summary row (chevron, when, status, model / backend,
 * branch / PR, ⋯) plus, while expanded, a full-width detail row
 * ({@link PlanWorkflowRunHistoryDetail}). Each row expands independently. Model / backend and
 * Branch / PR are hidden below `sm` and repeat in the detail instead.
 */
export const PlanWorkflowRunHistoryRow = (
  props: PlanWorkflowRunHistoryRowProps,
): React.ReactElement => {
  const { resumeScheduled, row, workflowInput, workingDirectory } = props;

  // Hooks
  const [expanded, setExpanded] = React.useState(false);
  const detailId = React.useId();

  // Setup
  const copy = PLAN_RUN_TRANSPARENCY_COPY.history;

  // Handlers
  const handleToggleExpanded = (): void => setExpanded((prev) => !prev);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <TableRow
        data-state={expanded ? 'open' : 'closed'}
        data-status={row.status}
        data-testid={`PlanWorkflowRunHistoryRow-${row.id}`}
      >
        <TableCell className="w-8 pr-0 align-top">
          <Button
            aria-controls={expanded ? detailId : undefined}
            aria-expanded={expanded}
            aria-label={copy.expandAriaLabel}
            className="group size-7"
            data-state={expanded ? 'open' : 'closed'}
            onClick={handleToggleExpanded}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronRightIcon
              aria-hidden={true}
              className="size-4 transition-transform group-data-[state=open]:rotate-90"
            />
          </Button>
        </TableCell>
        <TableCell className="align-top">
          <PlanRunTime value={row.createdAt} />
        </TableCell>
        <TableCell className="align-top">
          <div className="flex flex-col items-start gap-1">
            <PlanRunStatusCell
              resumeOfRunId={row.resumeOfRunId ?? null}
              resumeScheduled={resumeScheduled}
              scheduledFor={row.scheduledFor ?? null}
              status={row.status}
              usageLimitResetsAt={row.usageLimitResetsAt ?? null}
            />
            {row.isStale ? (
              <Badge
                data-testid="PlanWorkflowRunHistoryRow-stale"
                variant="destructive"
              >
                {copy.staleBadge}
              </Badge>
            ) : null}
          </div>
        </TableCell>
        <TableCell className="hidden align-top sm:table-cell">
          <PlanRunMetaList
            items={buildPlanRunMetaItems(row, PLAN_RUN_HISTORY_META_FIELDS)}
          />
        </TableCell>
        <TableCell className="hidden align-top sm:table-cell">
          <PlanRunProvenanceCell
            branch={row.branch}
            checkout={row.checkout}
            pullRequest={row.pullRequest}
          />
        </TableCell>
        <TableCell className="w-10 align-top">
          <PlanWorkflowRunHistoryRowActions
            bullmqJobId={row.bullmqJobId ?? null}
            runId={row.id}
          />
        </TableCell>
      </TableRow>

      {expanded ? (
        <TableRow
          className="hover:bg-transparent"
          data-testid={`PlanWorkflowRunHistoryRow-${row.id}-detail`}
          id={detailId}
        >
          <TableCell colSpan={PLAN_RUN_HISTORY_COLUMN_COUNT}>
            <PlanWorkflowRunHistoryDetail
              row={row}
              workflowInput={workflowInput}
              workingDirectory={workingDirectory}
            />
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
};
