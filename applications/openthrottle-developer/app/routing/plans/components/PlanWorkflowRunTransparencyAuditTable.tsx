import {
  Button,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import { GlobalPopoverActionsHeader } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type { PlanDetailRunHistoryQuery } from '~/__generated__/graphql';
import { collectResumedRunIds } from '~/global/utils/utils.usage-limit';
import { PlanWorkflowRunHistoryRow } from '~/routing/plans/components/PlanWorkflowRunHistoryRow';
import { PlanWorkflowRunSection } from '~/routing/plans/components/PlanWorkflowRunSection';
import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import {
  PLAN_RUN_HISTORY_FETCH_LIMIT,
  PLAN_RUN_HISTORY_INITIAL_ROWS,
} from '~/routing/plans/data/data.plan-run-history';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import { selectHistoryRuns } from '~/routing/plans/utils/plan-run-sections';

export type PlanRunAuditRow =
  PlanDetailRunHistoryQuery['planRunsByPlanId'][number];

export interface PlanWorkflowRunTransparencyAuditTableProps {
  readonly planRunAuditRows: readonly PlanRunAuditRow[];
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workingDirectory: string;
}

/**
 * @description The Runs card's Run history section: every run that is not SCHEDULED (those live
 * in Upcoming), newest first (see {@link selectHistoryRuns}). The first
 * {@link PLAN_RUN_HISTORY_INITIAL_ROWS} rows show, a "Show N more" button reveals the rest, and a
 * footer notes when the query's {@link PLAN_RUN_HISTORY_FETCH_LIMIT} was reached. Each row expands
 * inline ({@link PlanWorkflowRunHistoryRow}). Renders nothing when there is no history.
 */
export const PlanWorkflowRunTransparencyAuditTable = (
  props: PlanWorkflowRunTransparencyAuditTableProps,
): React.ReactElement | null => {
  const { planRunAuditRows, workflowInput, workingDirectory } = props;

  // Hooks
  const [showAll, setShowAll] = React.useState(false);

  // Setup
  const copy = PLAN_RUN_TRANSPARENCY_COPY.history;
  const resumedRunIds = collectResumedRunIds(planRunAuditRows);
  const historyRows = selectHistoryRuns(planRunAuditRows);
  const visibleRows = showAll
    ? historyRows
    : historyRows.slice(0, PLAN_RUN_HISTORY_INITIAL_ROWS);
  const hiddenCount = historyRows.length - visibleRows.length;
  // The limit caps every run, SCHEDULED included, so it is reached on the raw row count.
  const reachedFetchLimit =
    planRunAuditRows.length >= PLAN_RUN_HISTORY_FETCH_LIMIT;

  // Handlers
  const handleShowAll = (): void => setShowAll(true);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (historyRows.length === 0) {
    return null;
  }

  return (
    <PlanWorkflowRunSection heading={copy.heading}>
      <div data-testid="PlanWorkflowRunTransparencyAuditTable">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pr-0">
                <span className="sr-only">{copy.columns.expand}</span>
              </TableHead>
              <TableHead>{copy.columns.when}</TableHead>
              <TableHead>{copy.columns.status}</TableHead>
              <TableHead className="hidden sm:table-cell">
                {copy.columns.modelBackend}
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                {copy.columns.branch}
              </TableHead>
              <TableHead className="w-10 p-0">
                <GlobalPopoverActionsHeader />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <PlanWorkflowRunHistoryRow
                key={row.id}
                resumeScheduled={resumedRunIds.has(row.id)}
                row={row}
                workflowInput={workflowInput}
                workingDirectory={workingDirectory}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      {hiddenCount > 0 ? (
        <Button
          className="self-start"
          data-testid="PlanWorkflowRunTransparencyAuditTable-show-more"
          onClick={handleShowAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          {copy.showMore(hiddenCount)}
        </Button>
      ) : null}
      {reachedFetchLimit && hiddenCount === 0 ? (
        <p
          className="text-muted-foreground text-xs"
          data-testid="PlanWorkflowRunTransparencyAuditTable-limit"
        >
          {copy.fetchLimitFooter(PLAN_RUN_HISTORY_FETCH_LIMIT)}
        </p>
      ) : null}
    </PlanWorkflowRunSection>
  );
};
