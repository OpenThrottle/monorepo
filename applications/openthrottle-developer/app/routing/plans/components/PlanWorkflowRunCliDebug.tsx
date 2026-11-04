import {
  Button,
  buttonVariants,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import type { WorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  buildWorkflowRalphDebugBundleText,
  buildWorkflowRalphTuningDiffLabels,
  PLAN_RUN_BULLMQ_QUEUE_NAME,
  WORKFLOW_RALPH_CONFIG_PRECEDENCE,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import { PLANS_DETAIL_TAB_SEARCH_PARAM } from '~/routing/plans/utils/parsers';

export interface PlanWorkflowRunCliDebugProps {
  readonly planId: string;
  readonly workflowInput: WorkflowRalphRunOptionsInput;
  readonly workflowTimeout: string;
}

/**
 * @description The collapsed "CLI & debug" footer of the plan "Runs" card: copy the debug bundle,
 * jump to the plan-run queue, see which tuning differs from the defaults, and the one-line config
 * precedence. Uncontrolled and closed on every visit; the Configuration tab owns the full command.
 */
export const PlanWorkflowRunCliDebug = (
  props: PlanWorkflowRunCliDebugProps,
): React.ReactElement => {
  const { planId, workflowInput, workflowTimeout } = props;

  // Hooks
  const debugBundleText = React.useMemo(
    () =>
      buildWorkflowRalphDebugBundleText({
        iterationTimeoutText: workflowTimeout,
        planId,
        workflowInput,
      }).trim(),
    [planId, workflowInput, workflowTimeout],
  );
  const tuningDiffLabels = React.useMemo(
    () => buildWorkflowRalphTuningDiffLabels(workflowInput, workflowTimeout),
    [workflowInput, workflowTimeout],
  );

  // Setup
  const copy = PLAN_RUN_TRANSPARENCY_COPY.cli;
  const actionClassName = buttonVariants({ size: 'sm', variant: 'outline' });
  const configurationHref = `/plans/${encodeURIComponent(planId)}?${PLANS_DETAIL_TAB_SEARCH_PARAM}=configuration`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible
      className="border-border border-t pt-3"
      data-testid="PlanWorkflowRunCliDebug"
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
          <OpenThrottleClipboard
            className={actionClassName}
            label={copy.copyDebugBundle}
            text={debugBundleText}
          />
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
          {tuningDiffLabels.length === 0 ? (
            <p className="text-muted-foreground text-xs">{copy.diffEmpty}</p>
          ) : (
            <ul className="text-muted-foreground list-inside list-disc text-xs">
              {tuningDiffLabels.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">
            {copy.precedenceLabel}
          </span>{' '}
          {WORKFLOW_RALPH_CONFIG_PRECEDENCE}. {copy.precedenceSuffix}{' '}
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
