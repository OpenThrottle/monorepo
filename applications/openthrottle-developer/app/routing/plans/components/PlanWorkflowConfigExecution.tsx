import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import * as React from 'react';

import type { PlanRunOptions } from '~/routing/plans/utils/plan-run-options';
import {
  isSelectablePlanRunDriver,
  PLAN_RUN_SELECTABLE_DRIVERS,
} from '~/routing/plans/utils/plan-workflow-config-execution';

export interface PlanWorkflowConfigExecutionProps {
  className?: string;
  heading: string;
  input: PlanRunOptions;
  setInput: (updater: React.SetStateAction<PlanRunOptions>) => void;
}

export const PlanWorkflowConfigExecution = (
  props: PlanWorkflowConfigExecutionProps,
): React.ReactElement => {
  const { heading, input, setInput } = props;

  // Hooks

  // Setup
  const isCursor = input.driver === 'cursor';
  const driverLabel = isCursor ? 'Cursor (cursor-agent)' : 'Claude Code CLI';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      className="border-0"
      id="workflow-config-execution-legend"
      legend={heading}
    >
      <p className="text-muted-foreground text-xs">
        One agent CLI for the entire plan run, stored on the queued job for
        auditing.
      </p>
      <div className="space-y-2">
        <Label htmlFor="plan-workflow-config-driver">Agent CLI</Label>
        <Select
          onValueChange={(next) => {
            if (!isSelectablePlanRunDriver(next)) {
              return;
            }
            setInput((prev) => ({
              ...prev,
              driver: next,
            }));
          }}
          value={input.driver}
        >
          <SelectTrigger
            aria-label="Driver for this plan run"
            className="max-w-md"
            id="plan-workflow-config-driver"
          >
            <SelectValue>{driverLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PLAN_RUN_SELECTABLE_DRIVERS.map((id) => (
              <SelectItem key={id} value={id}>
                {id === 'cursor' ? 'Cursor (cursor-agent)' : 'Claude Code CLI'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </OpenThrottleFieldset>
  );
};
