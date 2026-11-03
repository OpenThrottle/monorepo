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
import { PlanWorkflowRunSection } from '~/routing/plans/components/PlanWorkflowRunSection';
import type { PlanRunAuditRow } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import { PlanWorkflowRunTransparencyAuditTable } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import type { RecentRun } from '~/routing/plans/components/PlanWorkflowRunTransparencyRecentRuns';
import { PlanWorkflowRunTransparencyRecentRuns } from '~/routing/plans/components/PlanWorkflowRunTransparencyRecentRuns';
import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowRunTransparencyProps {
  readonly planId: string;
  readonly planRunAuditRows: PlanRunAuditRow[];
  readonly recentPlanRuns: RecentRun[];
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
    recentPlanRuns,
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
  const runSections = hasRuns ? (
    <>
      {/* Upcoming slot (PlanWorkflowRunUpcoming): SCHEDULED rows + the
          plan.scheduledRunId backstop, hidden when nothing is scheduled. */}
      {/* Latest run slot (PlanWorkflowRunLatest): hidden when every run is
          SCHEDULED. */}
      <PlanWorkflowRunSection heading={copy.history.heading}>
        <PlanWorkflowRunTransparencyAuditTable
          planId={planId}
          planRunAuditRows={planRunAuditRows}
          workflowInput={workflowInput}
          workingDirectory={workingDirectory}
        />
        <PlanWorkflowRunTransparencyRecentRuns
          recentPlanRuns={recentPlanRuns}
        />
      </PlanWorkflowRunSection>
    </>
  ) : (
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
