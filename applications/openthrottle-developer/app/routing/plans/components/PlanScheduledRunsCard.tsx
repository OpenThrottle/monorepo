import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { PlanRunAuditRow } from '~/routing/plans/components/PlanWorkflowRunTransparencyAuditTable';
import { PlanWorkflowRunUpcoming } from '~/routing/plans/components/PlanWorkflowRunUpcoming';
import { PLAN_SCHEDULED_RUNS_CARD_COPY } from '~/routing/plans/data/data.copy';
import type { PlanScheduledRunRef } from '~/routing/plans/utils/plan-run-sections';
import { selectUpcomingRuns } from '~/routing/plans/utils/plan-run-sections';

export interface PlanScheduledRunsCardProps {
  readonly planId: string;
  readonly planRunAuditRows: readonly PlanRunAuditRow[];
  /** `plan.scheduledRunId` / `plan.scheduledRunAt`, the backstop for a run outside the history. */
  readonly scheduledRun: PlanScheduledRunRef;
}

/**
 * @description The plan's pending scheduled runs as a card of their own, for the Details tab when
 * the full Runs card ({@link PlanWorkflowRunTransparency}) is behind the preview flag. Scheduled
 * runs are work the user can still act on (see or cancel), so they are never preview-only. Reuses
 * {@link PlanWorkflowRunUpcoming}; renders nothing when no run is scheduled.
 */
export const PlanScheduledRunsCard = (
  props: PlanScheduledRunsCardProps,
): React.ReactElement | null => {
  const { planId, planRunAuditRows, scheduledRun } = props;

  // Hooks

  // Setup
  const copy = PLAN_SCHEDULED_RUNS_CARD_COPY;
  const hasUpcoming =
    selectUpcomingRuns(planRunAuditRows, scheduledRun).length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!hasUpcoming) {
    return null;
  }

  return (
    <Card data-testid="PlanScheduledRunsCard">
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg leading-none font-semibold">{copy.title}</h2>
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <PlanWorkflowRunUpcoming
          planId={planId}
          planRunAuditRows={planRunAuditRows}
          scheduledRun={scheduledRun}
        />
      </CardContent>
    </Card>
  );
};
