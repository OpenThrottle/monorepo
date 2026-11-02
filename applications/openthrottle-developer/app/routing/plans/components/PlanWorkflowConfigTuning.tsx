import type { ChatModelOption } from '@openthrottle/react-router-chat';
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import * as React from 'react';

import { PlanWorkflowConfigModelEffort } from '~/routing/plans/components/PlanWorkflowConfigModelEffort';
import type {
  WorkflowRalphDebugCli,
  WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';
import {
  DEFAULT_RALPH_ITERATIONS,
  WORKFLOW_RALPH_ENV_VARS,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowConfigTuningProps {
  heading: string;
  input: WorkflowRalphRunOptionsInput;
  iterationTimeoutText: string;

  /** @description Deferred discovered agent+model options for the model picker. */
  models: Promise<readonly ChatModelOption[]>;
  setInput: (
    updater: React.SetStateAction<WorkflowRalphRunOptionsInput>,
  ) => void;
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

  // Handlers
  const handleDebugChange = (value: WorkflowRalphDebugCli): void => {
    setInput((prev) => ({ ...prev, debugCli: value }));
  };

  const handleIterationsBlur = (): void => {
    if (input.iterations < 1 || Number.isNaN(input.iterations)) {
      setInput((prev) => ({
        ...prev,
        iterations: DEFAULT_RALPH_ITERATIONS,
      }));
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      className="border-0"
      id="workflow-run-layer3-legend"
      legend={heading}
    >
      <p className="text-muted-foreground text-xs">
        Control the run by adjusting the flags below, run a specific model and
        effort, limit the iteration count, etc..
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workflow-run-iterations">--iterations</Label>
          <Input
            aria-describedby="workflow-run-iterations-hint"
            aria-label="Iteration count for --iterations"
            id="workflow-run-iterations"
            min={1}
            onBlur={handleIterationsBlur}
            onChange={(e) => {
              const raw = e.target.valueAsNumber;
              if (!Number.isNaN(raw) && raw >= 1) {
                setInput((prev) => ({
                  ...prev,
                  iterations: Math.floor(raw),
                }));
              }
            }}
            type="number"
            value={input.iterations}
          />
          <p
            className="text-muted-foreground text-xs"
            id="workflow-run-iterations-hint"
          >
            Default {DEFAULT_RALPH_ITERATIONS}; omitted when default.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="workflow-run-iteration-timeout">
            --iteration-timeout (seconds)
          </Label>
          <Input
            aria-describedby="workflow-run-iteration-timeout-hint"
            aria-label="Per-iteration timeout in seconds for --iteration-timeout"
            autoComplete="off"
            id="workflow-run-iteration-timeout"
            inputMode="numeric"
            onChange={(e) => setIterationTimeoutText(e.target.value)}
            placeholder="e.g. 1800"
            value={iterationTimeoutText}
          />
          <p
            className="text-muted-foreground text-xs"
            id="workflow-run-iteration-timeout-hint"
          >
            Non-interactive only; empty omits the flag.
          </p>
        </div>
        <PlanWorkflowConfigModelEffort
          input={input}
          models={models}
          setInput={setInput}
        />
        <div className="space-y-2">
          <Label htmlFor="workflow-run-project">--project</Label>
          <Input
            aria-describedby="workflow-run-project-hint"
            aria-label="NX project name for --project"
            autoComplete="off"
            id="workflow-run-project"
            onChange={(e) =>
              setInput((prev) => ({ ...prev, project: e.target.value }))
            }
            placeholder="NX project name"
            spellCheck={false}
            value={input.project}
          />
          <p
            className="text-muted-foreground text-xs"
            id="workflow-run-project-hint"
          >
            From the Nx project graph; empty omits the flag.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="workflow-run-debug">Debug / verbose</Label>
        <Select
          onValueChange={(v) => {
            if (v === 'omit' || v === 'debug' || v === 'verbose') {
              handleDebugChange(v);
            }
          }}
          value={input.debugCli}
        >
          <SelectTrigger
            aria-describedby="workflow-run-debug-hint"
            className="max-w-md"
            id="workflow-run-debug"
          >
            <SelectValue placeholder="Shim debug" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="omit">
              Default (no CLI flags; use env if set)
            </SelectItem>
            <SelectItem value="debug">--debug</SelectItem>
            <SelectItem value="verbose">--verbose</SelectItem>
          </SelectContent>
        </Select>
        <p
          className="text-muted-foreground text-xs"
          id="workflow-run-debug-hint"
        >
          CLI overrides {WORKFLOW_RALPH_ENV_VARS.debug},{' '}
          {WORKFLOW_RALPH_ENV_VARS.debugAlias}, and{' '}
          {WORKFLOW_RALPH_ENV_VARS.verbose}.{' '}
          <code className="text-xs">--debug=verbose</code> matches{' '}
          <code className="text-xs">--verbose</code>.
        </p>
      </div>
    </OpenThrottleFieldset>
  );
};
