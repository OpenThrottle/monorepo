import * as React from 'react';

import { parseDate } from '~/global/utils/dates';
import { PlanRunCancelScheduledButton } from '~/routing/plans/components/PlanRunCancelScheduledButton';
import { PlanRunMetaList } from '~/routing/plans/components/PlanRunMetaList';
import { PlanRunStatusBadge } from '~/routing/plans/components/PlanRunStatusBadge';
import { PlanRunTime } from '~/routing/plans/components/PlanRunTime';
import { PlanWorkflowRunSection } from '~/routing/plans/components/PlanWorkflowRunSection';
import type { PlanRunAuditRow } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import { PLAN_RUN_UPCOMING_META_FIELDS } from '~/routing/plans/data/data.plan-run-history';
import type { PlanScheduledRunRef } from '~/routing/plans/utils/plan-run-sections';
import {
  buildPlanRunMetaItems,
  selectUpcomingRuns,
} from '~/routing/plans/utils/plan-run-sections';

export interface PlanWorkflowRunUpcomingProps {
  readonly planId: string;
  readonly planRunAuditRows: readonly PlanRunAuditRow[];
  /** `plan.scheduledRunId` / `plan.scheduledRunAt`: the backstop when that run is outside the fetched history. */
  readonly scheduledRun: PlanScheduledRunRef;
}

/**
 * @description The Runs card's Upcoming section: each SCHEDULED run, soonest first, as an
 * accent-tinted block with its fire time, status badge, model · effort · backend · workspace and a
 * Cancel button (the unchanged {@link PlanRunCancelScheduledButton}). `plan.scheduledRunId` adds a
 * minimal block when that run is not in the fetched history. Renders nothing when nothing is
 * scheduled; the card owns the no-runs `Empty`.
 */
export const PlanWorkflowRunUpcoming = (
  props: PlanWorkflowRunUpcomingProps,
): React.ReactElement | null => {
  const { planId, planRunAuditRows, scheduledRun } = props;

  // Hooks

  // Setup
  const copy = PLAN_RUN_TRANSPARENCY_COPY.upcoming;
  const items = selectUpcomingRuns(planRunAuditRows, scheduledRun);

  // Handlers

  // Markup
  const renderMeta = (item: (typeof items)[number]): React.ReactNode => {
    if (item.kind === 'run') {
      return (
        <PlanRunMetaList
          items={buildPlanRunMetaItems(item.run, PLAN_RUN_UPCOMING_META_FIELDS)}
        />
      );
    }
    return <p className="text-muted-foreground text-xs">{copy.backstopMeta}</p>;
  };
  const blocks = items.map((item) => {
    const hasFireTime = parseDate(item.scheduledFor) !== null;
    const knownFireTime = <PlanRunTime value={item.scheduledFor} />;
    const unknownFireTime = (
      <span data-testid="PlanWorkflowRunUpcoming-fires-unknown">
        {copy.firesUnknown}
      </span>
    );

    return (
      <li
        className="border-primary/30 bg-primary/5 flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
        data-kind={item.kind}
        data-testid="PlanWorkflowRunUpcoming-item"
        key={item.id}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
            <span className="text-muted-foreground font-normal">
              {copy.firesLabel}
            </span>
            {hasFireTime ? knownFireTime : unknownFireTime}
            <PlanRunStatusBadge status="SCHEDULED" />
          </div>
          {renderMeta(item)}
        </div>
        <div className="shrink-0">
          <PlanRunCancelScheduledButton planId={planId} planRunId={item.id} />
        </div>
      </li>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit
  if (items.length === 0) {
    return null;
  }

  return (
    <PlanWorkflowRunSection heading={copy.heading}>
      <ol className="flex flex-col gap-2" data-testid="PlanWorkflowRunUpcoming">
        {blocks}
      </ol>
    </PlanWorkflowRunSection>
  );
};
