import type { ChatModelOption } from '@openthrottle/react-router-chat';
import { Input, Label } from '@openthrottle/react-router-shadcn';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { PlanWorkflowConfigModelEffort } from '~/routing/plans/components/PlanWorkflowConfigModelEffort';
import { PLAN_CONFIG_TUNING_COPY } from '~/routing/plans/data/data.copy';
import type { PlanRunOptions } from '~/routing/plans/utils/plan-run-options';

export interface PlanWorkflowConfigTuningProps {
  heading: string;
  input: PlanRunOptions;
  iterationTimeoutText: string;

  /** @description Deferred discovered agent+model options for the model picker. */
  models: Promise<readonly ChatModelOption[]>;
  setInput: (updater: React.SetStateAction<PlanRunOptions>) => void;
  setIterationTimeoutText: (next: string) => void;
}

export const PlanWorkflowConfigTuning = (
  props: PlanWorkflowConfigTuningProps,
): React.ReactElement => {
  const {
    heading,
    input,
    iterationTimeoutText,
    models,
    setInput,
    setIterationTimeoutText,
  } = props;

  // Hooks

  // Setup
  const copy = PLAN_CONFIG_TUNING_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      className="border-0"
      id="workflow-run-layer3-legend"
      legend={heading}
    >
      <p className="text-muted-foreground text-xs">{copy.explainer}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workflow-run-iteration-timeout">
            {copy.timeoutLabel}
          </Label>
          <Input
            aria-describedby="workflow-run-iteration-timeout-hint"
            aria-label={copy.timeoutAriaLabel}
            autoComplete="off"
            id="workflow-run-iteration-timeout"
            inputMode="numeric"
            onChange={(e) => setIterationTimeoutText(e.target.value)}
            placeholder={copy.timeoutPlaceholder}
            value={iterationTimeoutText}
          />
          <p
            className="text-muted-foreground text-xs"
            id="workflow-run-iteration-timeout-hint"
          >
            {copy.timeoutHint}
          </p>
        </div>
        <PlanWorkflowConfigModelEffort
          input={input}
          models={models}
          setInput={setInput}
        />
      </div>
    </OpenThrottleFieldset>
  );
};
