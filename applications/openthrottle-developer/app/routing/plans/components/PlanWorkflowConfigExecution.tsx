import * as React from 'react';
import classnames from 'classnames';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import type {
  WorkflowRalphExecutionBackendUi,
  WorkflowRalphRunOptionsInput,
} from '~/routing/plans/utils/build-workflow-ralph-argv';

export interface PlanWorkflowConfigExecutionProps {
  className?: string;
  input: WorkflowRalphRunOptionsInput;
  setInput: (
    updater: React.SetStateAction<WorkflowRalphRunOptionsInput>,
  ) => void;
}

export const PlanWorkflowConfigExecution = (
  props: PlanWorkflowConfigExecutionProps,
) => {
  const { className, input, setInput } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={classnames('mt-8', className)}>
      <h2 className="pb-2 mb-4">Layer 2 — Execution backend</h2>
      <div>
        <fieldset
          aria-labelledby="plan-workflow-config-layer2-legend"
          className={classnames('space-y-4')}
          data-testid="PlanWorkflowConfigExecution"
        >
          <legend className="sr-only" id="plan-workflow-config-layer2-legend">
            Layer 2 — Execution backend
          </legend>
          <p className="text-muted-foreground text-xs">
            One runner for the entire plan run—serialized as{' '}
            <code className="text-xs">--backend</code> on{' '}
            <code className="text-xs">workflow-ralph</code> and stored on the
            queued job for auditing.
          </p>
          <div className="space-y-2">
            <Label htmlFor="plan-workflow-config-backend">Runner</Label>
            <Select
              onValueChange={(next) =>
                setInput((prev) => ({
                  ...prev,
                  executionBackend: next as WorkflowRalphExecutionBackendUi,
                }))
              }
              value={input.executionBackend}
            >
              <SelectTrigger
                aria-label="Execution backend for this plan run"
                className="max-w-md"
                id="plan-workflow-config-backend"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    'cursor',
                    'claude',
                  ] as const satisfies readonly WorkflowRalphExecutionBackendUi[]
                ).map((id) => (
                  <SelectItem key={id} value={id}>
                    {id === 'cursor'
                      ? 'Cursor (cursor-agent)'
                      : 'Claude Code CLI'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </fieldset>
      </div>
    </div>
  );
};
