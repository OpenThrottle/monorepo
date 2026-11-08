import { TriangleAlertIcon } from 'lucide-react';
import * as React from 'react';

import { collectResumedRunIds } from '~/global/utils/utils.usage-limit';
import { PlanRunMetaList } from '~/routing/plans/components/PlanRunMetaList';
import { PlanRunProvenanceCell } from '~/routing/plans/components/PlanRunProvenanceCell';
import { PlanRunStatusCell } from '~/routing/plans/components/PlanRunStatusCell';
import { PlanRunTime } from '~/routing/plans/components/PlanRunTime';
import { PlanWorkflowRunSection } from '~/routing/plans/components/PlanWorkflowRunSection';
import type { PlanRunAuditRow } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import { PLAN_RUN_LATEST_META_FIELDS } from '~/routing/plans/data/data.plan-run-history';
import {
  buildPlanRunMetaItems,
  isActivePlanRunStatus,
  selectLatestRun,
} from '~/routing/plans/utils/plan-run-sections';

export interface PlanWorkflowRunLatestProps {
  readonly planRunAuditRows: readonly PlanRunAuditRow[];
}

/**
 * @description The Runs card's Latest run section: the active (QUEUED / IN_PROGRESS) run, else the
 * newest run that is not SCHEDULED (see {@link selectLatestRun}). Shows its status (with the
 * usage-limit resume line), start time, model · backend, provenance, and either a last-heartbeat
 * line or a stale warning. Kill and Settle stay in the toolbar. Renders nothing when every run is
 * SCHEDULED; the same run is also history's first row.
 */
export const PlanWorkflowRunLatest = (
  props: PlanWorkflowRunLatestProps,
): React.ReactElement | null => {
  const { planRunAuditRows } = props;

  // Hooks

  // Setup
  const copy = PLAN_RUN_TRANSPARENCY_COPY.latest;
  const run = selectLatestRun(planRunAuditRows);
  const resumedRunIds = collectResumedRunIds(planRunAuditRows);
  const isStale = run?.isStale === true;
  const showHeartbeat =
    run !== null &&
    !isStale &&
    run.heartbeatExpected &&
    isActivePlanRunStatus(run.status) &&
    run.lastHeartbeatAt != null;

  // Handlers

  // Markup
  const staleWarning = (
    <p
      className="text-destructive flex items-center gap-1.5 text-xs"
      data-testid="PlanWorkflowRunLatest-stale"
      role="status"
    >
      <TriangleAlertIcon aria-hidden={true} className="size-3.5 shrink-0" />
      {copy.staleWarning}
    </p>
  );
  const heartbeatLine = (
    <p
      className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs"
      data-testid="PlanWorkflowRunLatest-heartbeat"
    >
      <span>{copy.heartbeatLabel}</span>
      <PlanRunTime value={run?.lastHeartbeatAt} />
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (run === null) {
    return null;
  }

  return (
    <PlanWorkflowRunSection heading={copy.heading}>
      <div
        className="border-border flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
        data-status={run.status}
        data-testid="PlanWorkflowRunLatest"
      >
        <div className="flex min-w-0 flex-col gap-1.5 text-sm">
          <PlanRunStatusCell
            resumeOfRunId={run.resumeOfRunId ?? null}
            resumeScheduled={resumedRunIds.has(run.id)}
            scheduledFor={run.scheduledFor ?? null}
            settledReason={run.settledReason ?? null}
            status={run.status}
            usageLimitResetsAt={run.usageLimitResetsAt ?? null}
          />
          <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs">
            <span>{copy.startedLabel}</span>
            <PlanRunTime value={run.createdAt} />
          </p>
          <PlanRunMetaList
            items={buildPlanRunMetaItems(run, PLAN_RUN_LATEST_META_FIELDS)}
          />
          {isStale ? staleWarning : null}
          {showHeartbeat ? heartbeatLine : null}
        </div>
        <div className="min-w-0 text-xs sm:max-w-[50%]">
          <PlanRunProvenanceCell
            branch={run.branch}
            checkout={run.checkout}
            pullRequest={run.pullRequest}
          />
        </div>
      </div>
    </PlanWorkflowRunSection>
  );
};
