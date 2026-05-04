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

export interface PlanWorkflowConfigExecutionProps {
  readonly className?: string;
}

export const PlanWorkflowConfigExecution = (
  props: PlanWorkflowConfigExecutionProps,
) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <fieldset
      aria-labelledby="workflow-run-layer2-legend"
      className={classnames(
        'space-y-3 rounded-md border border-border p-4',
        className,
      )}
      data-testid="PlanWorkflowConfigExecution"
      disabled={true} // FIXME: When we have runners remove this
    >
      <legend
        className="px-1 text-sm font-medium text-foreground"
        id="workflow-run-layer2-legend"
      >
        Layer 2 — Execution backend
      </legend>
      <p className="text-muted-foreground text-xs">
        Maps to <code className="text-xs">workflow-ralph --backend</code> (
        <code className="text-xs">WORKFLOW_RALPH_BACKEND</code> /{' '}
        <code className="text-xs">.workflow-ralph.json</code>
        ). Today only <code className="text-xs">cursor</code> is implemented;
        this panel stays fixed until additional backends ship.
      </p>
      <div className="space-y-2">
        <Label htmlFor="workflow-run-backend">Runner</Label>
        <Select disabled={true} value="cursor">
          <SelectTrigger
            aria-label="Execution backend (stub)"
            className="max-w-md"
            id="workflow-run-backend"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cursor">Cursor (current)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  );
};
