import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { KillPlanRunButton } from '~/routing/plans/components/KillPlanRunButton';
import { SettlePlanRunButton } from '~/routing/plans/components/SettlePlanRunButton';
import { getPlanIsCancelable } from '~/routing/plans/utils/utils.plans';

export interface PlanToolbarActiveRunControlProps {
  /**
   * `undefined` while the deferred run history is still loading. The Stale badge
   * is withheld then — "not stale" is a claim we cannot make yet — but Kill still
   * renders, because an operator mid-run needs it and hiding a control is worse
   * than briefly offering one that may turn out to be a no-op.
   */
  readonly newestRunIsStale: boolean | undefined;
  /**
   * Id of the newest run when it is an interactive (non-heartbeating) run still
   * IN_PROGRESS. Settle renders for it alongside Kill: Kill is right while the
   * agent is alive to poll the cancel marker; Settle is the escape hatch once it
   * is not. `undefined` while loading, `null` when the newest run is not one.
   */
  readonly newestUnsupervisedUnsettledRunId: string | null | undefined;
  readonly planId: string;
  readonly planStatus?: string;
  readonly planTitle: string;
}

/**
 * @description The active-run control of {@link PlanToolbarRunActions}: the
 * Stale badge or Kill button for a cancelable plan, plus the Settle escape
 * hatch when the newest run is an interactive run that nothing can settle on
 * its own. Extracted per component-primitive-shape R6.
 */
export const PlanToolbarActiveRunControl = (
  props: PlanToolbarActiveRunControlProps,
): React.ReactElement => {
  const {
    newestRunIsStale,
    newestUnsupervisedUnsettledRunId,
    planId,
    planStatus,
    planTitle,
  } = props;

  // Hooks

  // Setup
  const isCancelable = getPlanIsCancelable(planStatus);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      {/* Only the Stale badge depends on run history. While it is undefined we
          render Kill — the normal control — rather than nothing: an operator
          mid-run needs Kill, and "not stale" is the claim we cannot yet make. */}
      {isCancelable && newestRunIsStale === true ? (
        <Tooltip delayDuration={1_000}>
          <TooltipTrigger asChild={true}>
            <Badge color="amber" size="xs">
              Stale
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs" side="top">
            This run lost contact (its heartbeat went quiet) — the owning
            process likely crashed. Kill is unavailable because there is nothing
            live to stop; a background sweeper will settle it.
          </TooltipContent>
        </Tooltip>
      ) : (
        <KillPlanRunButton
          planId={planId}
          planTitle={planTitle}
          show={isCancelable}
          size="xs"
        />
      )}

      {/* Not gated on plan status: the stuck row holds its worktree regardless
          of where the plan itself has moved on to. */}
      {newestUnsupervisedUnsettledRunId != null ? (
        <SettlePlanRunButton
          planId={planId}
          planRunId={newestUnsupervisedUnsettledRunId}
          planTitle={planTitle}
          size="xs"
        />
      ) : null}
    </>
  );
};
