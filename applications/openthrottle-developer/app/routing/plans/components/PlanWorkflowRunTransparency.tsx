import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { HistoryIcon } from 'lucide-react';
import * as React from 'react';

import { PlanWorkflowRunCliDebug } from '~/routing/plans/components/PlanWorkflowRunCliDebug';
import { PlanWorkflowRunLatest } from '~/routing/plans/components/PlanWorkflowRunLatest';
import type { PlanRunAuditRow } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import { PlanWorkflowRunTransparencyAuditTable } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import { PlanWorkflowRunUpcoming } from '~/routing/plans/components/PlanWorkflowRunUpcoming';
import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import type { PlanRunMetricsEntry } from '~/routing/plans/utils/joinPlanRunJobMetrics';

export interface PlanWorkflowRunTransparencyProps {
  readonly planId: string;
  readonly planRunAuditRows: PlanRunAuditRow[];
  /** Completed-job metrics; Run history joins them onto rows by job id. */
  readonly planRunMetrics: readonly PlanRunMetricsEntry[];
  /** `plan.scheduledRunAt`: the fire time of {@link scheduledRunId}. */
  readonly scheduledRunAt: string | null;
  /** `plan.scheduledRunId`: a scheduled run can exist outside the fetched history window. */
  readonly scheduledRunId: string | null;
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workflowTimeout: string;
  readonly workingDirectory: string;
}

/**
 * @description The plan Details "Runs" card. Runs lead, in this order: Upcoming (scheduled runs),
 * Latest run (the active or most recent run), Run history; then a collapsed CLI & debug section
 * ({@link PlanWorkflowRunCliDebug}). A plan that has never run and has nothing scheduled shows one
 * `Empty` in place of the three run sections.
 */
export const PlanWorkflowRunTransparency = (
  props: PlanWorkflowRunTransparencyProps,
): React.ReactElement => {
  const {
    planId,
    planRunAuditRows,
    planRunMetrics,
    scheduledRunAt,
    scheduledRunId,
    workflowInput,
    workingDirectory,
    workflowTimeout,
  } = props;

  // Hooks

  // Setup
  const copy = PLAN_RUN_TRANSPARENCY_COPY;
  const hasRuns = planRunAuditRows.length > 0 || scheduledRunId !== null;

  // Handlers

  // Markup
  const runsMarkup = (
    <>
      <PlanWorkflowRunUpcoming
        planId={planId}
        planRunAuditRows={planRunAuditRows}
        scheduledRun={{ scheduledRunAt, scheduledRunId }}
      />
      <PlanWorkflowRunLatest planRunAuditRows={planRunAuditRows} />
      <PlanWorkflowRunTransparencyAuditTable
        planRunAuditRows={planRunAuditRows}
        planRunMetrics={planRunMetrics}
        workflowInput={workflowInput}
        workingDirectory={workingDirectory}
      />
    </>
  );
  const emptyMarkup = (
    <Empty
      className="border-border border border-dashed p-6 md:p-8"
      data-testid="PlanWorkflowRunTransparency-empty"
    >
      <EmptyMedia variant="icon">
        <HistoryIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>{copy.empty.title}</EmptyTitle>
      <EmptyDescription>{copy.empty.description}</EmptyDescription>
    </Empty>
  );
  const runSections = hasRuns ? runsMarkup : emptyMarkup;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg leading-none font-semibold">{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="flex flex-col gap-8"
          data-testid="PlanWorkflowRunTransparency"
          id="plan-workflow-run-transparency"
        >
          {runSections}
          <PlanWorkflowRunCliDebug
            planId={planId}
            workflowInput={workflowInput}
            workflowTimeout={workflowTimeout}
          />
        </div>
      </CardContent>
    </Card>
  );
};
