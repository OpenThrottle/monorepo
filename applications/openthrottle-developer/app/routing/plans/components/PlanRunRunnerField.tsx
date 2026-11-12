import type { PlanRunConfigRunner } from '@openthrottle/openthrottle-plan-config';
import {
  cn,
  Label,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PLAN_RUN_RUNNER_COPY } from '~/routing/plans/data/data.copy';
import { isPlanRunRunner } from '~/routing/plans/utils/plan-run-ot-loop';

export interface PlanRunRunnerFieldProps {
  readonly className?: string;
  readonly onRunnerChange: (runner: PlanRunConfigRunner) => void;
  readonly runner: PlanRunConfigRunner;
}

/**
 * @description The Ralph | OT Loop choice. A single-select group: re-clicking the active
 * runner does nothing, so a runner is always selected.
 */
export const PlanRunRunnerField = (
  props: PlanRunRunnerFieldProps,
): React.ReactElement => {
  const { className, onRunnerChange, runner } = props;

  // Hooks
  const labelId = React.useId();

  // Setup
  const copy = PLAN_RUN_RUNNER_COPY;

  // Handlers
  const handleValueChange = (value: string): void => {
    if (isPlanRunRunner(value)) {
      onRunnerChange(value);
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex flex-col gap-1.5', className)}
      data-testid="PlanRunRunnerField"
    >
      <Label id={labelId}>{copy.groupLabel}</Label>
      <ToggleGroup
        aria-labelledby={labelId}
        className="justify-start"
        onValueChange={handleValueChange}
        type="single"
        value={runner}
        variant="outline"
      >
        <ToggleGroupItem value="ralph">{copy.ralphLabel}</ToggleGroupItem>
        <ToggleGroupItem value="ot-loop">{copy.otLoopLabel}</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};
