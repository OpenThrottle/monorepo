import { ChatReasoningTierControl } from '@openthrottle/react-router-chat';
import { capabilitiesForChatOption } from '@openthrottle/react-router-chat-state';
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { SlidersHorizontalIcon } from 'lucide-react';
import * as React from 'react';

import { PLAN_RUN_MODEL_EFFORT_COPY } from '~/routing/plans/data/data.copy';
import { parsePlanRunEffort } from '~/routing/plans/utils/plan-run-model-effort';
import type { WorkflowRalphExecutionBackendUi } from '~/routing/plans/utils/workflow-ralph-config';
import { formatWorkflowRalphExecutionBackendLabel } from '~/routing/plans/utils/workflow-ralph-config';

export interface PlanRunEffortControlProps {
  /** @description Stored `runConfigJson.ralph.executionBackend`; decides which levels exist. */
  backend: WorkflowRalphExecutionBackendUi;
  className?: string;

  /** @description Stored `runConfigJson.ralph.effort`; empty means unset. */
  effort: string;
  onEffortChange: (effort: string) => void;
}

/**
 * @description State-free reasoning-effort control for plan runs, shared by the
 * Configuration tab and the Run dialog. Levels come from the selected backend's
 * `reasoningLevels` in `chat-capabilities`, never a local list. A backend with no
 * reasoning knob (cursor: effort is part of the model id) renders disabled with
 * the reason in a tooltip rather than vanishing.
 */
export const PlanRunEffortControl = (
  props: PlanRunEffortControlProps,
): React.ReactElement => {
  const { backend, className, effort, onEffortChange } = props;

  // Hooks
  const reasonId = React.useId();

  // Setup
  const copy = PLAN_RUN_MODEL_EFFORT_COPY;
  const capabilities = capabilitiesForChatOption({ backend });
  const hasEffort = capabilities.reasoningLevels.length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (hasEffort) {
    return (
      <ChatReasoningTierControl
        capabilities={{ ...capabilities, serviceTiers: [] }}
        className={className}
        onReasoningChange={onEffortChange}
        reasoning={parsePlanRunEffort(effort)}
      />
    );
  }

  const reason = copy.effortDisabledReason(
    formatWorkflowRalphExecutionBackendLabel(backend),
  );

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild={true}>
        {/* The span carries the pointer events a disabled button cannot, so the
            tooltip explaining WHY still opens. */}
        <span
          aria-describedby={reasonId}
          aria-label={copy.effortDisabledLabel}
          className="inline-flex"
          data-testid="PlanRunEffortControl-disabled"
          role="group"
          tabIndex={0}
        >
          <Button
            className={className}
            disabled={true}
            size="sm"
            type="button"
            variant="outline"
          >
            <SlidersHorizontalIcon aria-hidden={true} className="size-4" />
            {copy.effortDisabledLabel}
          </Button>
          <span className="sr-only" id={reasonId}>
            {reason}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs" side="top">
        {reason}
      </TooltipContent>
    </Tooltip>
  );
};
