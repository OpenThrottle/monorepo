import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import { buildPlanRunTuningDiffLabels } from '~/routing/plans/utils/buildPlanRunTuningDiffLabels';
import { PLANS_DETAIL_TAB_SEARCH_PARAM } from '~/routing/plans/utils/parsers';
import type { PlanRunOptions } from '~/routing/plans/utils/plan-run-options';
import { PLAN_RUN_BULLMQ_QUEUE_NAME } from '~/routing/plans/utils/plan-run-options';

export interface PlanWorkflowRunTuningSummaryProps {
  readonly planId: string;
  readonly workflowInput: PlanRunOptions;
  readonly workflowTimeout: string;
}

/**
 * @description The collapsed "Run tuning" footer of the plan "Runs" card: jump to the plan-run
 * queue and see which options differ from the defaults. Uncontrolled and closed on every visit;
 * the Configuration tab owns the options themselves.
 */
export const PlanWorkflowRunTuningSummary = (
  props: PlanWorkflowRunTuningSummaryProps,
): React.ReactElement => {
  const { planId, workflowInput, workflowTimeout } = props;

  // Hooks
  const tuningDiffLabels = React.useMemo(
    () => buildPlanRunTuningDiffLabels(workflowInput, workflowTimeout),
    [workflowInput, workflowTimeout],
  );

  // Setup
  const copy = PLAN_RUN_TRANSPARENCY_COPY.tuning;
  const configurationHref = `/plans/${encodeURIComponent(planId)}?${PLANS_DETAIL_TAB_SEARCH_PARAM}=configuration`;

  // Handlers

  // Markup
  const hasTuningDiff = tuningDiffLabels.length > 0;
  const diffEmpty = (
    <p className="text-muted-foreground text-xs">{copy.diffEmpty}</p>
  );
  const diffList = (
    <ul className="text-muted-foreground list-inside list-disc text-xs">
      {tuningDiffLabels.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible
      className="border-border border-t pt-3"
      data-testid="PlanWorkflowRunTuningSummary"
    >
      <h3>
        <CollapsibleTrigger asChild={true}>
          <Button
            className="group text-muted-foreground -ml-2 text-xs font-medium tracking-wide uppercase"
            size="sm"
            variant="ghost"
          >
            <ChevronRightIcon
              aria-hidden={true}
              className="size-3.5 transition-transform group-data-[state=open]:rotate-90"
            />
            {copy.heading}
          </Button>
        </CollapsibleTrigger>
      </h3>
      <CollapsibleContent className="flex flex-col gap-4 pt-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Button asChild={true} size="sm" variant="outline">
            <Link
              to={`/queues/${encodeURIComponent(PLAN_RUN_BULLMQ_QUEUE_NAME)}`}
            >
              {copy.queueLinkPrefix} {PLAN_RUN_BULLMQ_QUEUE_NAME}
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-foreground text-xs font-medium">
            {copy.diffHeading}
          </p>
          {hasTuningDiff ? diffList : diffEmpty}
        </div>
        <p className="text-muted-foreground text-xs">
          {copy.configurationSuffix}{' '}
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to={configurationHref}
          >
            {copy.configurationLink}
          </Link>
          .
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
};
